function validateImageUrl(url) {
    const pattern = /\.(jpeg|jpg|gif|png|svg|bmp|webp)$/i;
    return pattern.test(url);
}

function validateTextContent(text) {
    return text.trim().length > 0;
}

function createElement(tag, className = '', attributes = {}) {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    for (const key in attributes) {
        element.setAttribute(key, attributes[key]);
    }
    return element;
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}