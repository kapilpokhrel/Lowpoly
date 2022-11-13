var width = null;
var height = null;
var imageFile = null;
const imageArea = document.querySelector('.imageArea');
const imageArea_text = document.querySelector('.imageArea .text');
const browseButton = document.querySelector('.imageArea .button');
const imageBrowser = document.getElementById("imageBrowser");
const types = ['image/jpg', 'image/jpeg', 'image/png'];

function canvasResize() {
    var testCanvas = document.getElementById("testCanvas");
    var canvasArea = document.querySelector('.output .canvas');

    let clientWidth = canvasArea.clientWidth*95/100;
    let clientHeight = canvasArea.clientHeight*95/100;

    if(width == null){
        testCanvas.style.width = '100%';
        testCanvas.style.height = '100%';
    } else {
        if (width > height) {
            let canvasWidth = ~~Math.min(clientWidth, width);
            canvasWidth = ~~Math.min(canvasWidth, (width/height)*(clientHeight));
            testCanvas.style.width = `${canvasWidth}px`;
            testCanvas.style.height = `${height / width * canvasWidth}px`;
        } else {
            let canvasHeight = ~~Math.min(clientHeight, height);
            canvasHeight = ~~Math.min(canvasHeight, (height/width)*(clientWidth));
            testCanvas.style.height = `${canvasHeight}px`;
            testCanvas.style.width = `${width / height * canvasHeight}px`;
        }
    }
}

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
        setTimeout(() => {
            calculator.setExpression({
                latex: latex,
                fillOpacity: 1,
                fill: true,
                color: color
            })},
            0
        );

    }

}

function Process() {
    if (imageFile == null)
        alert("Image not selected");
    else {
        var edge_points = document.getElementById("edge-points").value;
        var bg_points = document.getElementById("bg-points").value;
        edge_points = (edge_points <= 0) ? 1 : edge_points;
        bg_points = (bg_points < 0) ? 0 : bg_points;

        var data = {
            file: imageFile,
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

canvasResize();
window.onresize = canvasResize;
browseButton.onclick = () => {
    imageBrowser.click();
}

imageBrowser.addEventListener('change', (event) => {
    imageFile = event.target.files[0];
    if(types.includes(imageFile.type))
        imageArea_text.textContent = imageFile.name;
    else
        alert("File type not supported");
});

imageArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    imageArea_text.textContent = "Release to Upload";
    imageArea.classList.add("active");
});

imageArea.addEventListener('dragleave', (event) => {
    imageArea_text.textContent = "Drag & Drop an image";
    imageArea.classList.remove("active");
});

imageArea.addEventListener('drop', (event) => {
    event.preventDefault();
    
    imageFile = event.dataTransfer.files[0];
    if(!types.includes(imageFile.type)) {
        imageFile = null;
        alert("File type not supported");
        imageArea_text.textContent = "Drag & Drop an image";
    } else {
        imageArea_text.textContent = imageFile.name;
    }
});