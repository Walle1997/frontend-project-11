import axios from 'axios';
import * as yup from 'yup';
import { v4 as uuidv4 } from 'uuid';
import keyBy from 'lodash/keyBy.js';
import getUrlWithProxy from '../../api/getUrlWithProxy.js';

const dataParser = (data) => {
  const parser = new DOMParser();
  const feedData = parser.parseFromString(data, 'text/xml');
  const parseerrors = feedData.querySelector('parsererror');
  if (parseerrors !== null) {
    const error = parseerrors.textContent;
    throw new Error(error);
  }
};

const isRSSUrl = (rawData) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(rawData.data.contents, 'application/xml');
  if (xmlDoc.getElementsByTagName('rss').length > 0) {
    return xmlDoc;
  }
  const error = new Error();
  error.type = 'noRSS';
  throw error;
};

export default class AddRssForm {
  currentTimerId = 0;

  constructor(watchedState, elements, i18nextInstance) {
    this.i18nextInstance = i18nextInstance;
    this.watchedState = watchedState;
    this.elements = elements;
  }

  init = () => {
    // проверить зачем тут DOMContentLoaded, мб достаточно просто rssForm.addEventListener('submit')
    document.addEventListener('DOMContentLoaded', () => {
      const { rssForm } = this.elements;
      rssForm.addEventListener('submit', (event) => {
        event.preventDefault();
        this.onSubmit();
      });
    });
  };

  onSubmit = () => {
    const { urlInput } = this.elements;
    const { value, name } = urlInput;

    this.watchedState.rssForm.data.fields.activeUrl = value;
    this.watchedState.rssForm.data.touchedFields[name] = true;

    this.validate(this.watchedState.rssForm.data.fields, this.watchedState.rssForm.data.rssUrls)
      // мб этот запрос излишний? мы же сделаем его в startPolling
      .then(async () => axios.get(getUrlWithProxy(value)))
      .then(async (rssData) => {
        const result = isRSSUrl(rssData);
        return result;
      })
      .then((data2) => {
        if (data2) {
          /*
          watchedState.rssForm.data.rssUrls = [
            ...state.rssForm.data.rssUrls,
            watchedState.rssForm.data.fields.activeUrl,
          ];
          */
          this.watchedState.rssForm.data.rssUrls.push(value);
          this.watchedState.rssForm.isValid = true;

          this.stopOldPolling();
          this.startPolling();
        } else {
          this.watchedState.rssForm.isValid = false;
        }
      })
      .catch((error) => {
        this.watchedState.rssForm.errors = error;
        this.watchedState.rssForm.isValid = false;
      });
  };

  createSchema = (rssUrls) => yup.object().shape({
    activeUrl: yup
      .string()
      .url(this.i18nextInstance.t('invalidUrl'))
      .required()
      .notOneOf(rssUrls, `${this.i18nextInstance.t('notOneOf')}`),
  });

  validate = async (fields, rssUrls) => {
    const schema = this.createSchema(rssUrls);
    try {
      await schema.validate(fields, { abortEarly: false });
      return {};
    } catch (e) {
      const errors = keyBy(e.inner, 'path');
      throw errors;
    }
  };

  // Get RSS stream
  getRSS = async (url) => {
    try {
      if (!this.watchedState.rssForm.isValid) {
        return false;
      }

      const response = await axios.get(getUrlWithProxy(url));
      dataParser(response.data.contents);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response.data.contents, 'application/xml');
      const mainTitle = xmlDoc.querySelectorAll('title')[0].textContent; // +
      const mainDescription = xmlDoc.querySelectorAll('description')[0].textContent; // +
      const items = xmlDoc.querySelectorAll('item');

      const rssData = [];

      let itemsId = uuidv4();
      rssData.push({ itemsId, mainTitle });
      itemsId = uuidv4();
      rssData.push({ itemsId, mainDescription });
      itemsId = uuidv4();
      items.forEach((item) => {
        const title = item.querySelector('title').textContent;
        const description = item.querySelector('description').textContent;
        const link = item.querySelector('link').textContent;
        rssData.push({
          itemsId, title, description, link,
        });
        itemsId = uuidv4();
      });

      return rssData;
    } catch (error) {
      if (error.message === 'Network Error') {
        this.watchedState.rssForm.errors = error;
        this.watchedState.rssForm.isValid = false;
      }

      return false;
    }
  };

  // Проверяю каждый RSS-поток
  checkEvenRssStream = async () => {
    const allRssStreams = this.watchedState.rssForm.data.rssUrls;
    const streamResults = await Promise.all(allRssStreams.map((stream) => this.getRSS(stream)));

    streamResults.forEach((result) => {
      if (result) {
        const titles = this.watchedState.rssForm.data.activeRssUrlsData.map((item) => item.title);
        const desc = this.watchedState.rssForm.data.activeRssUrlsData
          .map((item) => item.description);
        const filt = result
          .filter((i) => !titles.includes(i.title) && !desc.includes(i.description));

        if (filt.length > 0) {
          this.watchedState.rssForm.data.activeRssUrlsData = [
            ...this.watchedState.rssForm.data.activeRssUrlsData,
            ...filt,
          ];
        }
      }
    });
  };

  startPolling = async () => {
    await this.checkEvenRssStream();
    this.currentTimerId = setTimeout(this.startPolling, 10000);
  };

  stopOldPolling = () => {
    clearTimeout(this.currentTimerId);
  };
}
