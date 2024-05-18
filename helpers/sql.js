const { BadRequestError } = require("../expressError");

// THIS NEEDS SOME GREAT DOCUMENTATION.

/** Helper function for partially updating db entries, prepares
 * data for a db.query in the model file. 
 * 
 * dataToUpdate is self-explanatory, it is the data we 
 * want to update. However, it will be in JSON format, so 
 * it needs to be translated to sql format
 * 
 * jsToSql is an object where keys are in js syntax and associated
 * values are sql syntax
 * 
 * Returns {setCols, values} formatted for querying where 
 * setCols is a string (ie. `"col_one"=$1, "col_two"=$2 ...`) and 
 * values is an array (ie. ['val1', 2])
 * 
 */
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // Ex: {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      // get sql colName from jsToSql if it wasn't already formatted correctly,
      // or if it is formatted just use colName
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

// function sqlForFilter()

module.exports = { sqlForPartialUpdate };
