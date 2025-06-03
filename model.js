const viewerElement = document.querySelector('spline-viewer');

viewerElement.addEventListener('load', () => {
    const spline = viewerElement.scene;
    // Now it's safe to access Spline scene objects
    const allObjects = spline.children;
    allObjects.forEach(obj => console.log(obj.name));
});