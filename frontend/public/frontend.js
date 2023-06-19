document.getElementById("search-button").addEventListener("click", handleSearch);
document.getElementById("search-button2").addEventListener("click", handleSearch2);
// let viewGradeResult = document.getElementById("viewGradeResult");
const viewGradeResult2 = document.getElementById("viewGradeResult2");
// function handleClickMe() {
// 	alert("button click");
// }
async function handleSearch() {
	let subject = document.getElementById("subject").value;
	let year = document.getElementById("year").value;
	let course_number = document.getElementById("course-number").value;
	let error = document.getElementById("error");
	let viewGradeResult = document.getElementById("viewGradeResult");
	let query = createQuery(subject, parseInt(year), course_number);
	let tableLength = viewGradeResult.rows.length;
	// await clean(tableLength);
	error.innerHTML = "";
	viewGradeResult.innerHTML = "";

	let xmlHttpRequest = new XMLHttpRequest();
	xmlHttpRequest.open("POST", "/query", false);
	xmlHttpRequest.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	xmlHttpRequest.send(JSON.stringify(query));
	// alert(subject+ year+ course_number+xmlHttpRequest.responseText+tableLength);
	let result = JSON.parse(xmlHttpRequest.responseText);
	// alert(result.result);
	// if (result.error) {
	// 	alert(result.error);
	// 	return;
	// }
	if (result.result) {
		result = result.result;
	} else {
		error = result.error;
		document.getElementById("max-avg").innerHTML="";
		document.getElementById("min-avg").innerHTML="";
		alert(error);
		return;
	}
	// result = result.result;


	if (result.length === 0){
		error.innerHTML = "No Record, try again";
		document.getElementById("max-avg").innerHTML="";
		document.getElementById("min-avg").innerHTML="";
		return;
	}
	let max = 0;
	let min = result[0]["courses_avg"];
	for(let r of result){
		if (r["courses_avg"]>max){
			max=r["courses_avg"];
		}
		if (r["courses_avg"]<min){
			min=r["courses_avg"];
		}
	}
	document.getElementById("max-avg").innerHTML="The MAX AVG for this course in " + year+" is: "+max;
	document.getElementById("min-avg").innerHTML="The MIN AVG for this course in " + year+" is: "+min;

	if (result.length === 0){
		error.innerHTML = "No Record, try again";
		return;
	}
	for (let each in result) {
		show_result(each, viewGradeResult, result);
	}
}
async function handleSearch2() {
	let subject2 = document.getElementById("subject2").value;
	let course_number2 = document.getElementById("course-number2").value;
	let error2 = document.getElementById("error2");
	let query2 = createQuery2(subject2, course_number2);
	error2.innerHTML = "";
	viewGradeResult2.innerHTML = "";
	let xmlHttpRequest = new XMLHttpRequest();
	xmlHttpRequest.open("POST", "/query", false);
	xmlHttpRequest.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	xmlHttpRequest.send(JSON.stringify(query2));
	// alert(subject2+ course_number2+xmlHttpRequest.responseText);
	let result = JSON.parse(xmlHttpRequest.responseText);
	// result = result.result;
	if (result.result) {
		result = result.result;
	} else {
		error = result.error;
		document.getElementById("max-avg").innerHTML="";
		document.getElementById("min-avg").innerHTML="";
		alert(error);
		return;
	}

	if (result.length === 0){
		error2.innerHTML = "No Record, try again";
		return;
	}
	for( let each in result){
		show_result2(each,viewGradeResult2, result);
	}
}
function show_result(e,table,result){
	let newRow = table.insertRow();
	let cellInstructor = newRow.insertCell();
	let cellAvg = newRow.insertCell();
	cellInstructor.innerHTML = "Instructor: "+ result[e]["courses_instructor"];
	cellAvg.innerHTML ="AVG: " + result[e]["courses_avg"];
}
function show_result2(e,table,result){
	let newRow = table.insertRow();
	let cellYear = newRow.insertCell();
	let cellAvg = newRow.insertCell();
	cellYear.innerHTML ="Year: " + result[e]["courses_year"];
	cellAvg.innerHTML = "AVG:" + result[e]["overallAvg"];
}

function createQuery(subject, year, course_number) {
	return  {
		"WHERE": {
			"AND": [
				{
					"IS": {
						"courses_dept": subject.toLowerCase(),
					}
				},
				{
					"IS": {
						"courses_id": course_number
					}
				},
				{
					"EQ": {
						"courses_year": year
					}
				}]

		},
		"OPTIONS": {
			"COLUMNS": [
				"courses_instructor",
				"courses_avg"
			]
		}
	};
}
function createQuery2(subject, course_number) {
	return  {
		"WHERE": {
			"AND": [
				{
					"IS": {
						"courses_dept": subject.toLowerCase()
					}
				},
				{
					"IS": {
						"courses_id": course_number
					}
				}
			]
		},
		"OPTIONS": {
			"COLUMNS": [
				"courses_year",
				"overallAvg"
			]
		},
		"TRANSFORMATIONS": {
			"GROUP": [
				"courses_year"
			],
			"APPLY": [
				{
					"overallAvg": {
						"AVG": "courses_avg"
					}
				}
			]
		}
	};
}
