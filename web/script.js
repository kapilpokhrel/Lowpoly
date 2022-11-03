function draw_on_desmos(triangles) {
    var testCanvas = document.getElementById("testCanvas");
    if(testCanvas == null) {
        testCanvas = document.createElement("canvas");
        testCanvas.id = "testCanvas";
        testCanvas.width = 1200;
        testCanvas.height = 1000;
        document.body.appendChild(testCanvas);
    }
    var ctx = testCanvas.getContext('2d');
    ctx.clearRect(0, 0, testCanvas.width, testCanvas.height);

    for(let i = 0; i < triangles.length; i++) {
        let triangle = triangles[i];

        ctx.strokeStyle = "red";
        ctx.beginPath();
        ctx.moveTo(triangle[0][0], triangle[0][1]);
        ctx.lineTo(triangle[1][0], triangle[1][1]);
        ctx.lineTo(triangle[2][0], triangle[2][1]);
        ctx.closePath();
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