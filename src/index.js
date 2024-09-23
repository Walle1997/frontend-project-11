import './styles.scss';
import 'bootstrap';
import i18n from 'i18next';
import watch from './watcher.js';
import resources from './locales.js';
import {
  appendText,
} from './view.js';
import AddRssForm from './components/addRss/controller.js';

const app = async () => {
  const i18nextInstance = i18n.createInstance();
  // заменить все селекторы на id
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

  // это наша полная модель
  const state = {
    currentLocale: 'ru',
    feed: [],
    posts: [],
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

  const watchedState = watch(state, elements, i18nextInstance);
  // вот тут делать инит модулей, где будут уже eventListener'ы, туда и прокинем watchedState

  const addRssForm = new AddRssForm(watchedState, elements, i18nextInstance);
  addRssForm.init();

  return {
    state, i18nextInstance, elements, watchedState,
  };
};

const {
  elements, watchedState,
} = await app();

// все что ниже разнести по модулям
const showNetworkError = () => {
  const error = new Error('Network error!');
  error.type = 'networkError';
  watchedState.rssForm.errors = error;
  watchedState.rssForm.isValid = false;
};

const hiddeNetworkError = () => {
  watchedState.rssForm.isValid = true;
};

window.addEventListener('online', () => {
  hiddeNetworkError(); // Hide message about network error
});

window.addEventListener('offline', () => {
  showNetworkError(); // Show message about network error
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
