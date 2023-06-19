import InsightFacade from "../../src/controller/InsightFacade";
import {expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import fs from "fs-extra";
import {describe} from "mocha";
import {folderTest} from "@ubccpsc310/folder-test";
import {clearDisk} from "../TestUtils";


use(chaiAsPromised);

type Error = "InsightError" | "ResultTooLargeError";

describe("InsightFacade", function () {
	let courses: string;
	let room: string;
	before(function () {
		courses = fs.readFileSync("test/resources/archives/courses.zip").toString("base64");
		room = fs.readFileSync("test/resources/archives/rooms.zip").toString("base64");
	});
	describe ("addDataset", function () {

		let insightFacade: IInsightFacade;
		beforeEach(function() {
			clearDisk();
			insightFacade = new InsightFacade();
		});

		it("should add a valid dataset", function () {
			// const insightFacade = new InsightFacade();
			const result = insightFacade.addDataset("r",room,InsightDatasetKind.Rooms);
			// .then((result) => {expect(result).to.be.equal(["c"]);
			//                             expect(result).to.have.length(1);
			// });
			return expect(result).eventually.to.deep.equal(["r"]);
		});
		it("should reject with a dataset with whitespace id", function() {
			// const insightFacade = new InsightFacade();
			const result = insightFacade.addDataset(" ", courses, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it("should reject with a dataset with underscore id", function() {
			// const insightFacade = new InsightFacade();
			const result = insightFacade.addDataset("_", courses, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it("should reject with a dataset with underscore and whitespace id", function() {
			// const insightFacade = new InsightFacade();
			const result = insightFacade.addDataset("_ ", courses, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it("should reject with a dataset with underscore and char id", function() {
			// const insightFacade = new InsightFacade();
			const result = insightFacade.addDataset("_a", courses, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it("should reject with a dataset with underscore and char id", function() {
			// const insightFacade = new InsightFacade();
			const result = insightFacade.addDataset("a_", courses, InsightDatasetKind.Courses);
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it("should add a valid dataset with whitespace(front) and char id", function() {
			// const insightFacade = new InsightFacade();
			const result = insightFacade.addDataset(" c",courses,InsightDatasetKind.Courses);
			// .then((result)=> {
			//     expect(result).to.be.equal(["c "]);
			//     expect(result).to.have.length(1)}
			// );
			return expect(result).eventually.to.deep.equal([" c"]);
		});
		it("should add a valid dataset with whitespace(back) and char id", function() {
			// const insightFacade = new InsightFacade();
			const result = insightFacade.addDataset("c ",courses,InsightDatasetKind.Courses);
			// .then((result)=> {
			//     expect(result).to.be.equal(["c "]);
			//     expect(result).to.have.length(1)}
			// );
			return expect(result).eventually.to.deep.equal(["c "]);
		});
		it("should reject with a duplicate dataset", function() {
			// const insightFacade = new InsightFacade();
			const result = insightFacade.addDataset("c", courses, InsightDatasetKind.Courses)

				.then(() => insightFacade.addDataset("c", courses, InsightDatasetKind.Courses));
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it("should add a different dataset", function() {
			// const insightFacade = new InsightFacade();
			// let coursesTest: string =
			//     fs.readFileSync("test/resources/archives/test1.zip").toString("base64");
			const result = insightFacade.addDataset("c2", courses, InsightDatasetKind.Courses)
				.then(()=>insightFacade.addDataset("c1", courses,InsightDatasetKind.Courses));
			// .then((result)=> {
			//     expect(result).to.deep.equal(["c2", "c1"]);
			//     expect(result).to.have.length(2);
			// });
			return expect(result).eventually.to.deep.equal(["c2","c1"]);
		});
	});
	describe ("removeDataset", function () {
		let insightFacade: IInsightFacade;
		beforeEach(function() {
			clearDisk();
			insightFacade = new InsightFacade();
		});
		it ("should remove a dataset with a valid id from list with only one dataset", function () {

			const result = insightFacade.addDataset("c",courses,InsightDatasetKind.Courses)
				.then(() => insightFacade.removeDataset("c")).then(() => insightFacade.listDatasets());
			return (function() {
				expect(result).eventually.to.be.an.instanceof(Array);
				expect(result).eventually.to.have.length(0);
			});
		});
		it ("should not remove a dataset with an non-exit id from list with only one dataset", function () {
			const result = insightFacade.addDataset("e",courses,InsightDatasetKind.Courses)
				.then(() => insightFacade.removeDataset("d"));
			return expect(result).eventually.to.be.rejectedWith(NotFoundError);
		});
		it("should not remove a dataset from an empty list", function() {
			const result = insightFacade.removeDataset("pass");
			return expect(result).eventually.to.be.rejectedWith(NotFoundError);
		});
		it ("should remove a dataset(valid id) from list with many datasets", function () {
			return insightFacade.addDataset("c",courses,InsightDatasetKind.Courses)
				.then(() => {
					return insightFacade.addDataset("d",courses,InsightDatasetKind.Courses);
				})
				.then(() => {
					return insightFacade.removeDataset("d");
				})
				.then(()=>{
					return insightFacade.listDatasets();
				})
				.then((res) => {
					expect(res).to.be.an.instanceof(Array);
					expect(res).to.have.length(1);
					const theCourse = res.find((dataset) => dataset.id === "c");
					expect(theCourse).to.be.exist;
					expect(theCourse).to.deep.equal({
						id: "c",
						kind: InsightDatasetKind.Courses,
						numRows: 64612,
					});
				});
			// return (function() {expect(result).to.be.an.instanceof(Array);
			//                     expect(result).to.have.length(1);
			//                     const theCourse = result.find((dataset) => dataset.id === "c");
			//                     expect(result.)

			// })
		});
		it ("should not remove a dataset with an invalid id(underscore)", function() {
			const result = insightFacade.removeDataset("_");
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it ("should not remove a dataset with an invalid id(whitespace)", function() {
			const result = insightFacade.removeDataset(" ");
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it ("should not remove a dataset with an invalid id(more whitespaces)", function() {
			const result = insightFacade.removeDataset("   ");
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it ("should not remove a dataset with an invalid id(whitespacesnunderscore)", function() {
			const result = insightFacade.removeDataset(" _");
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it ("should not remove a dataset with an invalid id(hasUnderscore)", function() {
			const result = insightFacade.removeDataset("c_");
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it ("should not remove a dataset with an invalid id(hasUnderscore)", function() {
			const result = insightFacade.removeDataset("_c");
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it ("should not remove a dataset with an invalid id(hasUnderscore)", function() {
			const result = insightFacade.removeDataset("_c_");
			return expect(result).eventually.to.be.rejectedWith(InsightError);
		});
		it ("should remove a dataset with a valid id which has whitespace(back)", function() {
			const result = insightFacade.addDataset("c ",courses,InsightDatasetKind.Courses)
				.then(()=>insightFacade.removeDataset("c "));
			return (function() {
				expect(result).eventually.to.be.an.instanceof(Array);
				expect(result).eventually.to.have.length(0);

			});
		});
		it ("should remove a dataset with a valid id which has whitespace(front)", function() {
			const result = insightFacade.addDataset(" c",courses,InsightDatasetKind.Courses)
				.then(()=>insightFacade.removeDataset(" c"));
			return (function() {
				expect(result).eventually.to.be.an.instanceof(Array);
				expect(result).eventually.to.have.length(0);
			});
		});
	});
	describe("ListDataset", function(){
		let insightFacade: IInsightFacade;

		beforeEach(function() {
			clearDisk();
			insightFacade = new InsightFacade();
		});

		it("should list empty", function() {
			return insightFacade.listDatasets().then((res)=> {
				// clearDisk();
				expect(res).to.be.an.instanceof(Array);
				expect(res).to.have.length(0);
			});
		});

		it("should list one dataset", function() {
			return insightFacade.addDataset("c3",courses,InsightDatasetKind.Courses)
				.then((addedIds) => {
					return insightFacade.listDatasets();
				})
				.then((res) => {
					expect(res).to.deep.equal([{
						id: "c3",
						kind: InsightDatasetKind.Courses,
						numRows: 64612,
					}]);

					expect(res).to.be.an.instanceof(Array);
					expect(res).to.have.length(1);
					const [theOne] = res;
					expect(theOne).to.have.property("id");
					expect(theOne.id).to.equal("c3");
				});
		});

		it("should list two datasets", function() {
			return insightFacade.addDataset("c1",courses,InsightDatasetKind.Courses)
				.then(() => {
					return insightFacade.addDataset("c2",courses,InsightDatasetKind.Courses);
				})
				.then(() => {
					return insightFacade.listDatasets();
				})
				.then((res) => {
					expect(res).to.be.an.instanceof(Array);
					expect(res).to.have.length(2);
					const theCourse = res.find((dataset) =>
						dataset.id === "c1");
					expect(theCourse).to.exist;
					expect(theCourse).to.deep.equal({
						id: "c1",
						kind: InsightDatasetKind.Courses,
						numRows: 64612,
					});

				});
		});
	});
	describe("Dynamic folder test", function () {
		type Input = string;
		type Output = Promise<any[]>;

		let insightFacade: InsightFacade;

		before(function () {
			clearDisk();
			insightFacade = new InsightFacade();
			// return insightFacade.addDataset("courses",courses,InsightDatasetKind.Courses);
			insightFacade.addDataset("courses",courses,InsightDatasetKind.Courses);
			insightFacade.addDataset("r1",room,InsightDatasetKind.Rooms);
			return insightFacade.addDataset("rooms",room,InsightDatasetKind.Rooms);
		});


		// Assert value equals expected
		function assertResult(expected: Output, actual: any): void {
			expect(actual).to.deep.equals(expected);
		}

		// Assert actual error is of expected type
		function assertError(actual: any, expected: any): void {
			if (expected === "InsightError") {
				expect(actual).to.be.an.instanceOf(InsightError);
			} else if (expected === "ResultTooLargeError"){
				expect(actual).to.be.an.instanceOf(ResultTooLargeError);
			}
		}
		// it("query test", function() {
		folderTest<Input, Output, Error>(
			"Add Dynamic tests",
			// (input: Input): Output => {
			//     //const insightFacade = new InsightFacade();
			//     insightFacade.performQuery(input)},
			(input: Input): Output => insightFacade.performQuery(input),
			"./test/resources/queries",
			{
				assertOnResult: assertResult,
				assertOnError: assertError,                 // options
			}
		);
		// });
	});
});
