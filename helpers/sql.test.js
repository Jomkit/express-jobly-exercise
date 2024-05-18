const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql");

describe("sqlForPartialUpdate", function() {
    test("Formats data for partial updates", function() {
        const dataToUpdate = {firstName: 'Test', age: 21};
        const jsToSql = { "firstName": "first_name", "age": "age"}
        const res = sqlForPartialUpdate(dataToUpdate, jsToSql);

        expect(res).toEqual(
            {
                setCols: `"first_name"=$1, "age"=$2`, 
                values: ['Test', 21]
            }
        )
    })

    test("BadRequestError if passed no data", function() {
        try{
            const dataToUpdate = {};
            const jsToSql = { "firstName": "first_name", "age": "age"}
            const res = sqlForPartialUpdate(dataToUpdate, jsToSql);
            fail();
        }catch(e){
            expect(e instanceof BadRequestError).toBeTruthy();
        }
    })
})