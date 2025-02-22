const React = require('react');

function FullPage({ title, children }) {
  return React.createElement(
    'html',
    null,
    React.createElement(
      'head',
      null,
      React.createElement('title', null, title),
      React.createElement('link', { rel: 'stylesheet', href: '/styles.css' })
    ),
    React.createElement('body', null, children)
  );
}

function Homepage({ prompts }) {
  return React.createElement(
    FullPage,
    { title: 'My Blog' },
    React.createElement(
      'div',
      { className: 'container mx-auto p-4' },
      React.createElement('h1', { className: 'text-3xl font-bold mb-4' }, 'My Blog'),
      React.createElement(
        'ul',
        { className: 'list-disc pl-5' },
        prompts.map((prompt) =>
          React.createElement(
            'li',
            { key: prompt.slug, className: 'mb-2' },
            React.createElement(
              'a',
              { href: `/prompts/${prompt.slug}`, className: 'text-blue-500 hover:underline' },
              prompt.title
            ),
            ' - ',
            prompt.date
          )
        )
      )
    )
  );
}

function PromptPage({ title, date, content }) {
  return React.createElement(
    FullPage,
    { title },
    React.createElement(
      'div',
      { className: 'container mx-auto p-4' },
      React.createElement('h1', { className: 'text-3xl font-bold mb-2' }, title),
      React.createElement('p', { className: 'text-gray-600 mb-4' }, date),
      React.createElement('div', { dangerouslySetInnerHTML: { __html: content } })
    )
  );
}

module.exports = { Homepage, PromptPage };