var width = null;
var height = null;

function canvasResize() {
    var testCanvas = document.getElementById("testCanvas");
    var output = document.querySelector('.output');

    var flexdirection = window.getComputedStyle(output).flexDirection;
    if (width == null) {
        if (flexdirection == 'row') {
            testCanvas.style.width = '50%';
            testCanvas.style.height = '100%';
        } else {
            testCanvas.style.width = '100%';
            testCanvas.style.height = '50%';
        }
    }
    else {
        if (flexdirection == 'row') {
            if (width > height) {
                let canvasWidth = ~~Math.min(output.clientWidth * 50 / 100, width);
                testCanvas.style.width = `${canvasWidth}px`;
                testCanvas.style.height = `${height / width * canvasWidth}px`;
            }
            else {
                let canvasHeight = Math.min(output.clientHeight, height);
                testCanvas.style.height = `${canvasHeight}px`;
                testCanvas.style.width = `${width / height * canvasHeight}px`;
            }
        } else {
            if (width > height) {
                let canvasWidth = Math.min(output.clientWidth, width);
                canvasWidth = Math.min(canvasWidth, (width/height)*(output.clientHeight*0.5));
                testCanvas.style.width = `${canvasWidth}px`;
                testCanvas.style.height = `${height / width * canvasWidth}px`;
            }
            else {
                let canvasHeight = Math.min(output.clientHeight * 50 / 100, height);
                canvasHeight = Math.min(canvasHeight, (height/width)*(output.clientWidth));
                testCanvas.style.height = `${canvasHeight}px`;
                testCanvas.style.width = `${width / height * canvasHeight}px`;
            }
        }
    }
}

window.onresize = canvasResize;

function draw_on_desmos(data) {
    var triangles = data.triangles;
    width = data.width;
    height = data.height;

    //Canvas settings
    var testCanvas = document.getElementById("testCanvas");
    testCanvas.width = width;
    testCanvas.height = height;
    canvasResize();

    var ctx = testCanvas.getContext('2d');
    ctx.clearRect(0, 0, testCanvas.width, testCanvas.height);


    //Desmos settings
    calculator.setBlank();
    var coords = calculator.graphpaperBounds.mathCoordinates;
    var aRatio = coords.width / coords.height;
    var xboundry, yboundry;

    if (width > height) {
        {
            xboundry = 50 + width;
            yboundry = xboundry / aRatio;
        }
    } else {
        {
            yboundry = 50 + height;
            xboundry = aRatio * yboundry;
        }
    }
    calculator.setMathBounds({
        left: -xboundry,
        right: xboundry,
        top: yboundry,
        bottom: -yboundry
    });
    calculator.updateSettings({
        xAxisNumbers: false,
        yAxisNumbers: false,
        expressionsCollapsed: true
    });

    //Drawing triangles
    for (let i = 0; i < triangles.length; i++) {
        let vertices = triangles[i].vertices;
        let color = triangles[i].color;

        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        ctx.lineTo(vertices[1].x, vertices[1].y);
        ctx.lineTo(vertices[2].x, vertices[2].y);
        ctx.closePath();

        color = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.fill();
        ctx.stroke();

        let latex = `\\\operatorname{polygon}(
            (${vertices[0].x - width / 2}, ${-(vertices[0].y - height / 2)}),
            (${vertices[1].x - width / 2}, ${-(vertices[1].y - height / 2)}),
            (${vertices[2].x - width / 2}, ${-(vertices[2].y - height / 2)}))`;
        window.setTimeout(() => {
            calculator.setExpression({
                latex: latex,
                fillOpacity: 1,
                fill: true,
                color: color
            }),
                1
        });

    }

}

function Process() {
    var imagefile = document.getElementById("image-file");
    if (imagefile.value == "")
        alert("Image not selected");
    else {
        var file = imagefile.files[0];
        var edge_points = document.getElementById("edge-points").value;
        var bg_points = document.getElementById("bg-points").value;
        edge_points = (edge_points <= 0) ? 1 : edge_points;
        bg_points = (bg_points < 0) ? 0 : bg_points;

        var data = {
            file: file,
            points: {
                edge_points: edge_points,
                bg_points: bg_points
            }
        };

        var generator = new Worker("generator.js");

        generator.postMessage(data);
        generator.onmessage = function (msg) {
            draw_on_desmos(msg.data);
        };
    }
}