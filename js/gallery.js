// This file contains functions for handling the additional image gallery, including image uploads and display.

const galleryContainer = document.getElementById('gallery-container');

function addImageToGallery(imageUrl) {
    const imgElement = document.createElement('img');
    imgElement.src = imageUrl;
    imgElement.alt = 'Additional Image';
    imgElement.classList.add('gallery-image');
    galleryContainer.appendChild(imgElement);
}

function clearGallery() {
    galleryContainer.innerHTML = '';
}

function handleImageUpload(event) {
    const files = event.target.files;
    for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = function(e) {
            addImageToGallery(e.target.result);
        };
        reader.readAsDataURL(files[i]);
    }
}

function handleImageUrlSubmission(url) {
    addImageToGallery(url);
}