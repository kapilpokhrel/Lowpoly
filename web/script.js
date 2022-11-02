function draw_on_desmos(triangles) {

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