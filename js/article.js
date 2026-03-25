// article.js

let articles = [];

function publishArticle(title, mainImage, content, additionalImages) {
    const article = {
        title: title,
        mainImage: mainImage,
        content: content,
        additionalImages: additionalImages
    };
    articles.push(article);
    displayArticles();
}

function displayArticles() {
    const articlesContainer = document.getElementById('articles-container');
    articlesContainer.innerHTML = '';

    articles.forEach((article, index) => {
        const articleElement = document.createElement('div');
        articleElement.classList.add('article');

        articleElement.innerHTML = `
            <h2>${article.title}</h2>
            <img src="${article.mainImage}" alt="${article.title}" class="main-image">
            <p>${article.content}</p>
            <div class="additional-images">
                ${article.additionalImages.map(img => `<img src="${img}" alt="Additional image" class="additional-image">`).join('')}
            </div>
            <button onclick="deleteArticle(${index})">Supprimer</button>
        `;

        articlesContainer.appendChild(articleElement);
    });
}

function deleteArticle(index) {
    articles.splice(index, 1);
    displayArticles();
}