//Web Worker to generate triangles from image
importScripts("image.min.js");
importScripts("delaunay.js");

function get_points_from_sobel(grey_image, edge_points, bg_points){
    var blurred = grey_image.gaussianFilter({radius: 3, sigma:10});
    var sobel = blurred.sobelFilter();
    var threshold = sobel.getThreshold({algorithm: 'triangle'}) * 4;
    var height = sobel.height;
    var width = sobel.width;

    var edges = [];
    for (let y = 0; y < height; y += 2) {
        //skipping one pixel to make it a bit faster
        for(let x = 0; x < width; x += 2) {
            var sum = 0;
            var total = 0;
            for (let row = -1; row < 2; row++){
                var sy = y + row;
                if(sy >= 0 && sy < height) {
                    for(let col = -1; col < 2; col++) {
                        var sx = x + col;
                        if(sx >= 0 && sx < width) {
                            sum += sobel.getPixelXY(sx, sy)[0];
                            total += 1;
                        }
                    }
                }
            }

            if(total)
                if((sum/total) > threshold)
                    edges.push([x,y]);
        }        
    }
    var points = [];
    if(edge_points) {
        let increment = Math.max(~~(edges.length/edge_points), 1);
        for(let i = 0; i < edges.length; i += increment)
            points.push(edges[i]);
    }

    for(let i = 0; i < bg_points; i++) {
        let x = Math.floor(Math.random()*width);
        let y = Math.floor(Math.random()*height);
        points.push([x,y]);
    }

    points.push([0,0]);
    points.push([0, height-1]);
    points.push([width-1, 0]);
    points.push([width-1, height-1]);
    return points;
}

function generate_triangles(image, points) {
    var points = get_points_from_sobel(image.grey(), points.edge_points, points.bg_points);
    var vertices = Delaunay.triangulate(points);
    var triangles = [];

    for(let i = 0; i < vertices.length; i += 3) {
        triangles.push([
            points[vertices[i]],
            points[vertices[i+1]],
            points[vertices[i+2]]
        ]);
    }
    return triangles;
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