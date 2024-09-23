import _ from 'lodash';

const renderErrors = (errors, i18nextInstance) => {
  const errorP = document.querySelector('.feedback');
  const input = document.querySelector('#url-input');
  const setErrorState = (message) => {
    input.classList.add('is-invalid');
    errorP.textContent = message;
    errorP.classList.add('text-danger');
  };
  input.classList.remove('is-invalid');
  errorP.classList.remove('text-danger', 'text-success');

  if (errors.activeUrl) {
    setErrorState(errors.activeUrl.message);
    return;
  }

  if (errors.isRSSUrlError) {
    setErrorState(i18nextInstance.t('notValidRSS'));
    return;
  }

  if (errors.isNetworkError) {
    setErrorState(i18nextInstance.t('isNetworkError'));
    return;
  }

  switch (errors.type) {
    case 'noRSS':
    case 'networkError':
      setErrorState(i18nextInstance.t(errors.type === 'noRSS' ? 'notValidRSS' : 'isNetworkError'));
      break;
    default:
      throw new Error('Неизвестная ошибка');
  }
};

const clearErrors = (i18nextInstance) => {
  const errorMessage = document.querySelector('.feedback');
  errorMessage.textContent = `${i18nextInstance.t('successRSS')}`;
  const invalidInputs = document.querySelectorAll('.is-invalid');
  invalidInputs.forEach((input) => input.classList.remove('is-invalid'));
  errorMessage.classList.remove('text-danger');
  errorMessage.classList.add('text-success');
  const urlInput = document.querySelector('#url-input');
  urlInput.value = '';
  urlInput.focus();
};

// Render RSS lists
function renderRssLists(rsses, state, i18nextInstance) {
  document.querySelector('.posts').innerHTML = '';
  document.querySelector('.feeds').innerHTML = '';
  const divCard = document.createElement('div');
  divCard.classList.add('card', 'border-0');
  const divCardBody = document.createElement('div');
  divCardBody.classList.add('card-body');
  const divCardBodyH2 = document.createElement('h2');
  divCardBodyH2.classList.add('card-title', 'h4');
  divCardBodyH2.textContent = i18nextInstance.t('posts');
  divCardBody.appendChild(divCardBodyH2);
  const divCardUl = document.createElement('ul');
  divCardUl.classList.add('list-group', 'border-0', 'rounded-0');
  for (let i = rsses.length - 1; i >= 2; i -= 1) {
    const rss = rsses[i];
    const li = document.createElement('li');
    li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
    const a = document.createElement('a');
    a.setAttribute('href', `${rss.link}`);
    const aClass = state.rssForm.data.clickedListElements.has(rss.itemsId) ? 'fw-normal' : 'fw-bold';
    a.classList.add(aClass);
    if (state.rssForm.data.clickedListElements.has(rss.itemsId)) {
      a.style = 'color: #6c757d';
    }
    a.setAttribute('data-id', `${rss.itemsId}`);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    a.textContent = `${rss.title}`;
    const button = document.createElement('button');
    button.setAttribute('type', 'button');
    button.classList.add('btn', 'btn-outline-primary', 'btn-sm');
    button.setAttribute('data-id', `${rss.itemsId}`);
    button.setAttribute('data-bs-toggle', 'modal');
    button.setAttribute('data-bs-target', '#modal');
    button.textContent = i18nextInstance.t('viewing');
    li.appendChild(a);
    li.appendChild(button);
    divCardUl.appendChild(li);
  }
  divCard.appendChild(divCardBody);
  divCard.appendChild(divCardUl);
  document.querySelector('.posts').appendChild(divCard);
  // Add feeds
  const divFeeds = document.querySelector('.feeds');
  const divFeedsCard = document.createElement('div');
  divFeedsCard.classList.add('card', 'border-0');
  const divCardBody2 = document.createElement('div');
  divCardBody2.classList.add('card-body');
  const divCardBody2H2 = document.createElement('h2');
  divCardBody2H2.classList.add('card-title', 'h4');
  divCardBody2H2.textContent = i18nextInstance.t('feeds');
  divCardBody2.appendChild(divCardBody2H2);
  const ulFeeds = document.createElement('ul');
  ulFeeds.classList.add('list-group', 'border-0', 'rounded-0');
  const liFeeds = document.createElement('li');
  liFeeds.classList.add('list-group-item', 'border-0', 'border-end-0');
  const h3Feeds = document.createElement('h3');
  h3Feeds.classList.add('h6', 'm-0');
  h3Feeds.textContent = rsses[0].mainTitle;
  const pFeeds = document.createElement('p');
  pFeeds.classList.add('m-0', 'small', 'text-black-50');
  pFeeds.textContent = rsses[1].mainDescription;
  liFeeds.append(h3Feeds, pFeeds);
  ulFeeds.appendChild(liFeeds);
  divFeedsCard.append(divCardBody2, ulFeeds);
  divFeeds.appendChild(divFeedsCard);
}

// Locales
function appendText(elements, i18nextInstance) {
  const currentElements = _.cloneDeep(elements);
  currentElements.h1RuName.textContent = i18nextInstance.t('h1RuName');
  currentElements.leadP.textContent = i18nextInstance.t('leadP');
  currentElements.formFloatingDivLabel.textContent = i18nextInstance.t('formFloatingDivLabel');
  currentElements.textMutedP.textContent = i18nextInstance.t('textMutedP');
  currentElements.btn.textContent = i18nextInstance.t('btn');
  currentElements.textCenter.textContent = i18nextInstance.t('textCenter');
  currentElements.textCenterA.setAttribute('href', '');
  currentElements.textCenterA.setAttribute('target', '_blank');
  currentElements.textCenterA.textContent = i18nextInstance.t('textCenterA');
  currentElements.textCenter.appendChild(currentElements.textCenterA);
  currentElements.btnPrimary.textContent = i18nextInstance.t('btnPrimary');
  currentElements.btnSecondary.textContent = i18nextInstance.t('btnSecondary');
  currentElements.title = i18nextInstance.t('title');
}

// function renderingTextModal(fData, btnId) {
function renderingTextModal(fData, btnIds, elements) {
  const currentElements = _.cloneDeep(elements);
  currentElements.modalTitle.textContent = fData.title;
  currentElements.modalBody.textContent = fData.description;
  currentElements.fullArticle.setAttribute('href', `${fData.link}`);
  btnIds.forEach((btnId) => {
    const clickedListElement = document.querySelector(`.list-group-item [data-id="${String(btnId)}"]`);
    clickedListElement.classList.remove('fw-bold');
    clickedListElement.classList.add('fw-normal');
    clickedListElement.style = 'color: #6c757d';
  });
}

export {
  renderErrors,
  clearErrors,
  renderRssLists,
  appendText,
  renderingTextModal,
};
