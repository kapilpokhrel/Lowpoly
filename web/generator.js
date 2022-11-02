//Web Worker to generate triangles from image
importScripts("image.min.js");

function generate_triangles(image, points) {
    
}

self.onmessage = function(msg) {
    if(msg.data !== undefined) {
        var reader = new FileReader();
        reader.onload = async function(e) {
            var image = await IJS.Image.load(e.target.result);
            var triangles = generate_triangles(image, msg.data.points);
            self.postMessage(triangles);
        };
        reader.readAsDataURL(msg.data.file);
    }
}