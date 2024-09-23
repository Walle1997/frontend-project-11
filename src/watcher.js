import onChange from 'on-change';
import {
  renderRssLists, renderErrors, clearErrors, renderingTextModal,
} from './view.js';

export default function watch(state, elements, i18nextInstance) {
  const watchedState = onChange(state, (path, value) => {
    switch (path) {
      case 'rssForm.isValid': {
        if (value === true) {
          clearErrors(i18nextInstance);
        }
        return;
      }
      case 'rssForm.errors': {
        renderErrors(state.rssForm.errors, i18nextInstance);
        return;
      }
      case 'rssForm.data.activeRssUrlsData': {
        if (value.length !== 0) {
          renderRssLists(value, state, i18nextInstance);
        }
        return;
      }
      case 'rssForm.data.clickedListElements': {
        const currClickId = state.rssForm.data.currentClickedListElement;
        const fD = state.rssForm.data.activeRssUrlsData.filter((i) => i.itemsId === currClickId);
        renderingTextModal(fD[0], value, elements);
        break;
      }
      default:
        break;
    }
  });

  return watchedState;
}
