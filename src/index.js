import keyBy from 'lodash/keyBy.js';
import './styles.scss';
import 'bootstrap';
import * as yup from 'yup';
import onChange from 'on-change';
import i18n from 'i18next';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import resources from './locales.js';
import {
  renderRssLists, appendText, renderErrors, clearErrors, renderingTextModal,
} from './view.js';

const app = async () => {
  const i18nextInstance = i18n.createInstance();
  const elements = {
    modalTitle: document.querySelector('.modal-title'),
    modalBody: document.querySelector('.modal-body'),
    fullArticle: document.querySelector('.full-article'),
    urlInput: document.querySelector('#url-input'),
    rssForm: document.querySelector('.rss-form'),
    posts: document.querySelector('.posts'),
    h1RuName: document.querySelector('.display-3'),
    leadP: document.querySelector('.lead'),
    formFloatingDivLabel: document.querySelector('.form-floating label'),
    textMutedP: document.querySelector('.text-muted'),
    btn: document.querySelector('[aria-label="add"]'),
    textCenter: document.querySelector('.text-center'),
    textCenterA: document.createElement('a'),
    btnPrimary: document.querySelector('.btn-primary'),
    btnSecondary: document.querySelector('.btn-secondary'),
    title: document.querySelector('title'),
  };

  await i18nextInstance.init({
    lng: 'ru',
    debug: true,
    resources,
  });

  appendText(elements, i18nextInstance);

  const state = {
    currentLocale: 'ru',
    rssForm: {
      stateForm: 'filling',
      isValid: false,
      errors: {},
      data: {
        fields: {
          activeUrl: '',
        },
        touchedFields: {
          url: false,
        },
        rssUrls: [],
        activeRssUrlsData: [],
        clickedListElements: new Set(),
        currentClickedListElement: '',
      },
    },
  };

  const watchedState = onChange(state, (path, value) => {
    if (path === 'rssForm.isValid') {
      if (value === false) {
        renderErrors(state.rssForm.errors, i18nextInstance);
      } else {
        clearErrors(i18nextInstance);
      }
    }
    if (path === 'rssForm.errors') {
      renderErrors(state.rssForm.errors, i18nextInstance);
    }
    if (path === 'rssForm.data.activeRssUrlsData') {
      if (value.length !== 0) {
        renderRssLists(value, state, i18nextInstance);
      }
    }
    if (path === 'rssForm.data.clickedListElements') {
      const currClickId = state.rssForm.data.currentClickedListElement;
      const fD = state.rssForm.data.activeRssUrlsData.filter((i) => i.itemsId === currClickId);
      renderingTextModal(fD[0], value, elements);
    }
  });

  return {
    state, i18nextInstance, elements, watchedState,
  };
};

const {
  state, i18nextInstance, elements, watchedState,
} = await app();

const showNetworkError = () => {
  const error = new Error('Network error!');
  error.type = 'networkError';
  watchedState.rssForm.errors = error;
  watchedState.rssForm.isValid = false;
};

const hiddeNetworkError = () => {
  watchedState.rssForm.isValid = true;
};

const getUrlWithProxy = (url) => {
  const urlWithProxy = new URL('/get', 'https://allorigins.hexlet.app/');
  urlWithProxy.searchParams.set('disableCache', 'true');
  urlWithProxy.searchParams.set('url', url);
  return urlWithProxy.toString();
};

let isOnline = true;

const checkInternetConnection = () => {
  axios.get(getUrlWithProxy(watchedState.rssForm.data.fields.activeUrl))
    .then(() => {
      if (!isOnline) {
        isOnline = true;
        hiddeNetworkError();
      }
    })
    .catch(() => {
      if (isOnline) {
        isOnline = false;
        showNetworkError();
      }
    });
};

function repeatCheck() {
  checkInternetConnection();
  setTimeout(repeatCheck, 1000);
}

const dataParser = (data) => {
  const parser = new DOMParser();
  const feedData = parser.parseFromString(data, 'text/xml');
  const parseerrors = feedData.querySelector('parsererror');
  if (parseerrors !== null) {
    const error = parseerrors.textContent;
    throw new Error(error);
  }
};

// Get RSS stream
const getRSS = async (url) => {
  try {
    if (state.rssForm.isValid) {
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
    }
    return false;
  } catch (error) {
    if (error.message === 'Network Error') {
      watchedState.rssForm.errors = error;
      watchedState.rssForm.isValid = false;
    }
    return false;
  }
};

// Проверяю каждый RSS-поток
function checkEvenRssStream() {
  const allRssStreams = watchedState.rssForm.data.rssUrls;
  allRssStreams.forEach((RssStream) => {
    getRSS(RssStream)
      .then((d) => {
        if (d) {
          const titles = watchedState.rssForm.data.activeRssUrlsData.map((item) => item.title);
          const desc = watchedState.rssForm.data.activeRssUrlsData.map((item) => item.description);
          const filt = d.filter((i) => !titles.includes(i.title) && !desc.includes(i.description));
          if (filt.length > 0) {
            watchedState.rssForm.data.activeRssUrlsData = [
              ...watchedState.rssForm.data.activeRssUrlsData,
              ...filt,
            ];
          }
        }
      })
      .catch((error) => {
        if (error.message === 'Network Error') {
          watchedState.rssForm.errors = error;
          watchedState.rssForm.isValid = false;
        }
      });
  });
}

function repeat() {
  checkEvenRssStream();
  setTimeout(repeat, 5000);
}

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

const createSchema = (rssUrls) => yup.object().shape({
  activeUrl: yup
    .string()
    .url(i18nextInstance.t('invalidUrl'))
    .required()
    .notOneOf(rssUrls, `${i18nextInstance.t('notOneOf')}`),
});

const validate = async (fields, rssUrls) => {
  const schema = createSchema(rssUrls);
  try {
    await schema.validate(fields, { abortEarly: false });
    return {};
  } catch (e) {
    const errors = keyBy(e.inner, 'path');
    throw errors;
  }
};

const handler = async () => {
  const { urlInput } = elements;
  const { value, name } = urlInput;
  watchedState.rssForm.data.fields.activeUrl = value;
  watchedState.rssForm.data.touchedFields[name] = true;
  validate(watchedState.rssForm.data.fields, watchedState.rssForm.data.rssUrls)
    .then(async (data0) => {
      if (!Object.keys(data0).length === 0) {
        throw data0;
      }
      const response = await axios.get(getUrlWithProxy(watchedState.rssForm.data.fields.activeUrl));
      return response;
    })
    .then(async (data1) => {
      const result = isRSSUrl(data1);
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
        watchedState.rssForm.data.rssUrls.push(watchedState.rssForm.data.fields.activeUrl);
        watchedState.rssForm.isValid = true;
        repeat();
      } else {
        watchedState.rssForm.isValid = false;
      }
    })
    .catch((error) => {
      watchedState.rssForm.errors = error;
      watchedState.rssForm.isValid = false;
    });
};

window.addEventListener('online', () => {
  hiddeNetworkError(); // Hide message about network error
});

window.addEventListener('offline', () => {
  showNetworkError(); // Show message about network error
});

document.addEventListener('DOMContentLoaded', () => {
  const { rssForm } = elements;
  rssForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await handler();
    repeatCheck();
  });
});

elements.posts.addEventListener('click', (event) => {
  if (event.target.classList.contains('btn-sm')) {
    const btnId = event.target.getAttribute('data-id');
    watchedState.rssForm.data.currentClickedListElement = btnId;
    watchedState.rssForm.data.clickedListElements.add(btnId);
  }
});

// Функция для обработки всех новых элементов в узле
function handleNewElements(node) {
  return new Promise((resolve, reject) => {
    try {
      const res = [];
      node.querySelectorAll('.list-group-item a').forEach((element) => {
        res.push(element.href);
      });
      resolve(res);
    } catch (error) {
      reject(error);
    }
  });
}

// Создаю новый MutationObserver
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        handleNewElements(node)
          .catch((error) => {
            console.error('Ошибка в handleNewElements:', error);
          });
      }
    });
  });
});

// Настраиваю и запускаю MutationObserver
observer.observe(elements.posts, {
  childList: true,
  subtree: true,
});
