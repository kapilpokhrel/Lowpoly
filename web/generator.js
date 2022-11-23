//Web Worker to generate triangles from image
importScripts("external-libs/image.min.js");
importScripts("external-libs/delaunay.js");

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

function find_median(array) {
    array = array.sort(function (a, b) { return a - b });

    var length = array.length;

    if (length % 2 == 1) {
        return array[(length / 2) - .5]
    }
    else {
        return (array[length / 2] + array[(length / 2) - 1]) / 2;
    }
}

function find_boundingBox(vertices) {
    var minx = Number.MAX_VALUE;
    var maxx = Number.MIN_VALUE;
    var miny = Number.MAX_VALUE;
    var maxy = Number.MIN_VALUE;

    for (let i = 0; i < vertices.length; i++) {
        let point = vertices[i];
        minx = Math.min(minx, point.x);
        maxx = Math.max(maxx, point.x);
        miny = Math.min(miny, point.y);
        maxy = Math.max(maxy, point.y);
    }

    return {
        'x1': minx,
        'x2': maxx,
        'y1': miny,
        'y2': maxy
    };
}

function inTriangle(vertices, p) {
    var p1 = vertices[0];
    var p2 = vertices[1];
    var p3 = vertices[2];

    var find_area = function (a, b, c) {
        return Math.abs((a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)) / 2.0);
    }

    var area = find_area(p1, p2, p3);
    var area1 = find_area(p, p2, p3);
    var area2 = find_area(p1, p, p3);
    var area3 = find_area(p1, p2, p);

    return (area === area1 + area2 + area3);
}

function get_triangle_color(image, triangle) {

        var r = [];
        var g = [];
        var b = [];

        var bbox = find_boundingBox(triangle);
        for (let x = bbox.x1; x <= bbox.x2; x++) {
            for (let y = bbox.y1; y <= bbox.y2; y++) {
                if (inTriangle(triangle, {x:x, y:y})) {
                    let pixel = image.getPixelXY(x, y);
                    r.push(pixel[0]);
                    g.push(pixel[1]);
                    b.push(pixel[2]);
                }
            }
        }
        var red = ~~find_median(r);
        var green = ~~find_median(g);
        var blue = ~~find_median(b);
        return [red, green, blue];
}

function generate_triangles(image, points) {
    var points = get_points_from_sobel(image.grey(), points.edge_points, points.bg_points);
    var vertices = Delaunay.triangulate(points);
    var triangles = [];

    for(let i = 0; i < vertices.length; i += 3) {
        let p1 = points[vertices[i]];
        let p2 = points[vertices[i+1]];
        let p3 = points[vertices[i+2]];
        let triangle = [
            {x: p1[0], y: p1[1]},
            {x: p2[0], y: p2[1]},
            {x: p3[0], y: p3[1]}
        ];
        let color = get_triangle_color(image, triangle)
        triangles.push({
            vertices: triangle,
            color: color
        });

    }
    return {
        triangles: triangles,
        width: image.width,
        height: image.height
    };
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
