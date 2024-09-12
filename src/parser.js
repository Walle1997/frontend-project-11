const getFeedData = (document) => {
  const feedData = {
    title: document.querySelector('title').textContent,
    description: document.querySelector('description').textContent,
  };
  return feedData;
};

const getPostData = (document) => {
  const items = document.querySelectorAll('item');
  const postData = [...items].map((item) => ({
    title: item.querySelector('title').textContent,
    description: item.querySelector('description').textContent,
    link: item.querySelector('link').textContent,
  }));
  return postData;
};

export default (data) => {
  const parser = new DOMParser();
  const parsedXml = parser.parseFromString(data, 'application/xml');
  if (parsedXml.querySelector('parsererror')) {
    const error = new Error(parsedXml.querySelector('parsererror').textContent);
    error.name = 'parsingError';
    throw error;
  }
  return {
    feed: getFeedData(parsedXml),
    posts: getPostData(parsedXml),
  };
};
