function draw_on_desmos(triangles) {
    var testCanvas = document.getElementById("testCanvas");
    if(testCanvas == null) {
        testCanvas = document.createElement("canvas");
        testCanvas.id = "testCanvas";
        testCanvas.width = 5000;
        testCanvas.height = 5000;
        document.body.appendChild(testCanvas);
    }
    var ctx = testCanvas.getContext('2d');
    ctx.clearRect(0, 0, testCanvas.width, testCanvas.height);

    for(let i = 0; i < triangles.length; i++) {
        let vertices = triangles[i].vertices;
        let color = triangles[i].color;

        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        ctx.lineTo(vertices[1].x, vertices[1].y);
        ctx.lineTo(vertices[2].x, vertices[2].y);
        ctx.closePath();

        ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        ctx.strokeStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        ctx.fill();
        ctx.stroke();
        
    }

}

function Process() {
    var imagefile = document.getElementById("image-file");
    if(imagefile.value == "")
        alert("Image not selected");
    else {
        var file = imagefile.files[0];
        var edge_points = document.getElementById("edge-points").value;
        var bg_points = document.getElementById("bg-points").value;
        edge_points = (edge_points < 0) ? 1: edge_points;
        bg_points = (bg_points < 0) ? 1: bg_points;
        
        var data = {
            file: file,
            points: {
                edge_points: edge_points,
                bg_points: bg_points
            }
        };

        var generator = new Worker("generator.js");
        
        generator.postMessage(data);
        generator.onmessage = function(msg) {
            draw_on_desmos(msg.data);
        };
    }
}