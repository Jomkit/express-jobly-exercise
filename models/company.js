"use strict";

const { query } = require("express");
const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   * 
   * Filterable by name, min or max employees (Consider refactoring later)
   * 
   * filterStatement: variable for preparing an SQL WHERE clause
   * filterSqlArr: array for containing multiple filters
   * filterVals: array for values to be passed as parameterized values
   * 
   * sqlQuery: string containing sql query, if there are filters they will
   * be passed in via filterStatement
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * 
   * */

  static async findAll(queryStringData={}) {
    let queryKeys = Object.keys(queryStringData);
    let queryValues = Object.values(queryStringData);

    const {minEmployees, maxEmployees} = queryStringData;
    // throw error if minEmployees is greater than maxEmployees
    if(minEmployees > maxEmployees) throw new ExpressError("minEmployees must be less than maxEmployees", 400);

    let filterStatement = "";
    let filterSqlArr = []; // Array of filter sql statements, goes after WHERE
    let filterVals = []; // Arr of vals corr. by index to above sql statements

    // check if queryStringData has any filter parameters, and 
    // push to filteredSqlArr => ["(name ILIKE $1)", "(numEmployees < $2)", ...]
    if(queryKeys.length !== 0){
      filterStatement = "WHERE";
      for(let i in queryKeys){
        if(queryKeys[i] == "name"){
          // name needs to be prepared specially for partial filters using % wildcards
          filterSqlArr.push(`(name ILIKE $${parseInt(i)+1})`);
          filterVals.push(`%${queryValues[i]}%`);
          // console.log(filterVals);

        }else if(queryKeys[i] == "minEmployees"){
          // filter companies by a minimum number of employees
          filterSqlArr.push(`(num_employees > $${parseInt(i)+1})`);
          
          filterVals.push(parseInt(queryValues[i]));
        }else if(queryKeys[i] == "maxEmployees"){
          // filter companies by a maximum number of employees
          filterSqlArr.push(`(num_employees < $${parseInt(i)+1})`);
          
          filterVals.push(parseInt(queryValues[i]));
        }else{
          // If filter parameter not matching named filters, throw error
          throw new ExpressError(`Invalid filter parameter: ${queryKeys[i]}`, 400);
        }
      }   
      filterStatement += filterSqlArr.join(' AND ');
    }

    const sqlQuery = 
    `SELECT handle,
            name,
            description,
            num_employees AS "numEmployees",
            logo_url AS "logoUrl"
    FROM companies
    ${filterStatement}
    ORDER BY name`;
    
    const companiesRes = await db.query(sqlQuery, filterVals);

    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `WITH job_info AS 
                  (SELECT id, title, salary, equity 
                   FROM jobs
                   WHERE company_handle = $1)
           SELECT c.handle,
                  c.name,
                  c.description,
                  c.num_employees AS "numEmployees",
                  c.logo_url AS "logoUrl",
                  json_agg(job_info.*) AS "jobs"
           FROM companies c
           JOIN jobs j ON j.company_handle = c.handle
           JOIN job_info ON job_info.title = j.title
           WHERE handle = $1
           GROUP BY c.handle`,
        [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
