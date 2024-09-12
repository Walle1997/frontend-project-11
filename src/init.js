import * as yup from 'yup';
import i18next from 'i18next';
import axios from 'axios';
import { differenceBy, uniqueId } from 'lodash';
import watcher from './view.js';
import resources from './locales/index.js';
import domParser from './parser.js';
import 'bootstrap';

const UPDATE_DELAY_MS = 5000;

const proxy = (link) => {
  const url = new URL('https://allorigins.hexlet.app/get');
  url.searchParams.set('disableCache', 'true');
  url.searchParams.set('url', link);
  const proxyLink = url.toString();
  return proxyLink;
};

const getPostsWithIds = (posts, feedId) => {
  const newPosts = posts.map((post) => ({
    ...post,
    feedId,
    id: uniqueId(),
  }));
  return newPosts;
};

export default () => {
  const i18n = i18next.createInstance();

  i18n.init({
    lng: 'ru',
    debug: false,
    resources,
  });

  yup.setLocale({
    string: {
      url: i18n.t('invalidURL'),
    },
    mixed: {
      notOneOf: i18n.t('alreadyExists'),
      required: i18n.t('invalidURL'),
    },
  });

  const elements = {
    form: document.querySelector('.rss-form'),
    input: document.querySelector('#url-input'),
    feedback: document.querySelector('.feedback'),
    submitButton: document.querySelector('button[type="submit"]'),
    feeds: document.querySelector('.feeds'),
    posts: document.querySelector('.posts'),
    modal: document.querySelector('#modal'),
  };

  const initalState = {
    form: {
      status: 'filling',
      errors: null,
    },
    uiState: {
      viewedPostsIds: [],
      currentPostId: '',
    },
    feeds: [],
    posts: [],
  };

  const state = watcher(initalState, elements, i18n);

  const handleSubmit = (event) => {
    event.preventDefault();

    state.form.status = 'request';
    state.form.errors = null;

    const formData = new FormData(event.target);
    const url = formData.get('url').trim();

    const schema = yup
      .string()
      .required()
      .url()
      .notOneOf(state.feeds.map((feed) => feed.link));

    schema
      .validate(url).then(() => {
        const proxyLink = proxy(url);
        axios
          .get(proxyLink)
          .then((response) => {
            const responseDataContents = response.data.contents;
            const { feed, posts } = domParser(responseDataContents);

            feed.id = uniqueId();
            feed.link = url;
            const postsWithIds = getPostsWithIds(posts, feed.id);

            state.feeds = [feed, ...state.feeds];
            state.posts = [...postsWithIds, ...state.posts];

            state.form.status = 'response';
            state.form.errors = null;
          })
          .catch((err) => {
            state.form.status = 'error';
            state.form.errors = err.name === 'parsingError' ? 'parsingError' : 'networkError';
          });
      }).catch((err) => {
        state.form.status = 'error';
        state.form.errors = err.message;
      });
  };

  const handleClick = (event) => {
    const targetId = event.target.dataset.id;
    if (targetId && !state.uiState.viewedPostsIds.includes(targetId)) {
      state.uiState.viewedPostsIds = state.uiState.viewedPostsIds.concat(targetId);
      state.uiState.currentPostId = targetId;
    }
  };

  const checkUpdates = () => {
    const promises = state.feeds.map(({ link, id }) => {
      const promise = axios.get(proxy(link));
      return promise
        .then((response) => {
          const responseDataContents = response.data.contents;
          const { posts } = domParser(responseDataContents);

          const newPosts = differenceBy(posts, state.posts, 'link');
          const newPostsWithIds = getPostsWithIds(newPosts, id);
          state.posts = newPostsWithIds.concat(state.posts);
        })
        .catch(() => {
          state.form.status = 'error';
          state.form.errors = 'updateError';
        });
    });
    Promise.all(promises).finally(() => setTimeout(checkUpdates, UPDATE_DELAY_MS));
  };

  elements.form.addEventListener('submit', handleSubmit);
  elements.posts.addEventListener('click', handleClick);
  checkUpdates();
};
