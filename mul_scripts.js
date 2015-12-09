
var name = "Eitan";

var cells;

var pics = 33;
var done_pics = 2;
var wrong_mp3s = 9;
var fun_mp3s = 5;

var randPic = 1;
var randMP = 1;

function init() {
	//console.log("Loading: " + name);
	
	cells = new Array(10);
	cells[0] = [0,0,0,0,0,0,0,0,0,0];
	cells[1] = [0,0,0,1,0,0,1,1,0,0];
	cells[2] = [0,0,0,0,0,1,0,0,1,0];
	cells[3] = [0,0,1,0,0,0,1,0,1,0];
	cells[4] = [0,0,0,1,0,0,0,1,1,0];
	cells[5] = [0,0,0,0,0,1,1,1,1,0];
	cells[6] = [0,0,0,0,1,0,1,1,0,0];
	cells[7] = [0,0,0,1,0,1,1,1,0,0];
	cells[8] = [0,0,0,1,1,0,1,1,1,0];
	cells[9] = [0,0,0,0,0,0,0,0,0,0];
}

function change_cell(x,y,e) {

	// tab - do nothing
	var unicode = e.keyCode ? e.keyCode : e.charCode;
	if (unicode==9) {
		return;
	}

	var correct = x * y;
	var cell_obj = document.getElementById("c_"+x+"_"+y);
	var cell_val = cell_obj.value;
	
	if (cell_val == correct) {
		cell_obj.className = "mul_input";
		setLabelWithAnswer(x,y);		
		if (cells[x-1][y-1] > 0) {
			showImg();
			//alert("image");
		}
	}
	else {
		if (cell_val == "") {
			cell_obj.className = "mul_input";
			setLabel(x,y);
		}
		else if (correct >= 10 && cell_val < 10) {
			setLabel(x,y);
		}
		else {
			cell_obj.className = "mul_input_wrong";
			setLabel(x,y);
			hideImg();
			playFailedSound();
		}
	}
	
	if (isRowCompleted(x)) {
		if (isCompleted()) {
			showDoneImg();
		}
		else {
			playFunSound();
		}		
	}
}

function showImg() {
	randPic = Math.floor((Math.random()*pics) + 1);
	document.getElementById("fun_pic").src = "pic/" + randPic + ".jpg";
}

function showDoneImg() {
	randPic = Math.floor((Math.random()*done_pics) + 1);
	document.getElementById("fun_pic").src = "pic/done_" + randPic + ".jpg";
}

function hideImg() {
	document.getElementById("fun_pic").src = "";
}

function playFailedSound() {
	randMP = Math.floor((Math.random()*wrong_mp3s) + 1);
	document.getElementById("mul_sound").src = "mp/wrong_"+randMP+".mp3";
}

function playFunSound() {
	randMP = Math.floor((Math.random()*fun_mp3s) + 1);
	document.getElementById("mul_sound").src = "mp/fun_"+randMP+".mp3";
}			

function setLabel(x,y) {
	document.getElementById("label_1").innerText = x + " X " + y + " =";
	document.getElementById("label_2").innerText = x + " X " + y + " =";
}

function setLabelWithAnswer(x,y) {
	document.getElementById("label_1").innerText = x + " X " + y + " = " + (x*y);
	document.getElementById("label_2").innerText = x + " X " + y + " = " + (x*y);
}

function isRowCompleted(x) {
	var completed = true;
	for (y = 1; y <= 10; y++) {
		var cell_val = document.getElementById("c_"+x+"_"+y).value;
		if (cell_val != x*y) {
			completed = false;
		}
	}
	return completed;
}

function isCompleted() {
	var completed = true;
	for (x = 2; x <= 9; x++) {
		if (!isRowCompleted(x)) {
			completed = false;
		}
	}
	return completed;
}

function fill_all() {
	for (x = 2; x <= 9; x++) {
		for (y = 2; y <= 9; y++) {
			document.getElementById("c_"+x+"_"+y).value = x*y;
		}
	}
}



			
