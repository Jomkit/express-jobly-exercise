"use strict";

const { query } = require("express");
const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs */

class Job {
    /** Create a job (from data), update db, return new job data
     * 
     * data should be { title, salary, equity, company_handle }
     * 
     * returns { title, salary, equity, company_handle }
     * 
     * Throws BadRequestError if job already in database
     */
    static async create({ title, salary, equity, companyHandle }){
        const duplicateCheck = await db.query(
            `SELECT title FROM jobs
            WHERE title = $1`, 
        [title]);
        
        if(duplicateCheck.rows[0]) throw new BadRequestError(`Duplicate job title: ${title}`);
        
        const result = await db.query(
            `INSERT INTO jobs
            (title, salary, equity, company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, salary, equity, company_handle AS "companyHandle"
            `,
            [title, salary, equity, companyHandle]
        );
        const job = result.rows[0];

        return job;
    }

    /** Find all jobs 
     * 
     * Filterable by title, minSalary, and has Equity only
    */
    static async findAll(queryStringData={}){
        let queryKeys = Object.keys(queryStringData);
        let queryValues = Object.values(queryStringData);
        
        let filterStatement = "";
        let filterSqlArr = []; // Array of filter sql statements, goes after WHERE
        let filterVals = []; // Arr of vals corr. by index to above sql statements

        // Check if queryStringData has any filter parameters, and 
        // push to filteredSqlArr => ["(title ILIKE $1)", "(minSalary < $2)", ...]
        if(queryKeys.length != 0){
            filterStatement = "WHERE";
            for(let i in queryKeys){
                if(queryKeys[i] == "title"){
                    //title needs to be prepared specially for partial filters using % wildcards
                    filterSqlArr.push(`(title ILIKE $${parseInt(i)+1})`);
                    filterVals.push(`%${queryValues[i]}%`);

                }else if(queryKeys[i] == "minSalary"){
                    //filter jobs by minimum salary
                    filterSqlArr.push(`(salary > $${parseInt(i)+1})`);
                    filterVals.push(parseInt(queryValues[i]));

                }else if(queryKeys[i] == "hasEquity" && queryKeys[i]){
                    // filter jobs by "hasEquity" == true
                    filterSqlArr.push(`(equity > $${parseInt(i)+1})`);
                    filterVals.push(0);

                }else{
                    // If filter parameter not matching named filters, throw error
                    throw new ExpressError(`Invalid filter parameter: ${queryKeys[i]}`, 400);
                }
            }
            filterStatement += filterSqlArr.join(' AND ');
        }

        const sqlQuery = 
            `SELECT id, 
                    title, 
                    salary, 
                    equity, 
                    company_handle AS "companyHandle"
             FROM jobs
             ${filterStatement}
             ORDER BY title
            `;
        
        const results = await db.query(sqlQuery, filterVals);

        return (results.rows);
    }

    /** Get a job by id */
    static async get(jobId){
        const result = await db.query(`
        SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs
        WHERE id = $1`,
        [jobId])
        
        if(result.rows.length == 0) throw new NotFoundError("No job found");    
        
        return (result.rows[0]);    
    }

    /** Update a job by id 
     * 
     * Can only update title, salary, and equity
    */
    static async update(jobId, updateData){
        const { setCols, values } = sqlForPartialUpdate(
            updateData, 
            {
                title: "title", 
                salary: "salary",
                equity: "equity"
            });
        const jobIdx = "$" + (values.length + 1);

        const querySql = `UPDATE jobs 
        SET ${setCols}
        WHERE id = ${jobIdx}
        RETURNING id, title, salary, equity, company_handle AS "companyHandle"`;

        const result = await db.query(querySql, [...values, jobId]);
        const job = result.rows[0];

        if(!job) throw new NotFoundError(`No job with id: ${jobId}`);
        return job;
    }

    /** Remove a job by id; returns undefined
     * 
     * Throws NotFoundError if job not found
     */

    static async remove(jobId){
        const result = await db.query(
            `DELETE 
            FROM jobs
            WHERE id = $1
            RETURNING id`, 
            [jobId]);
        
        // Just need to return id to check if we we deleted something; if id returned,
        // then we deleted something. Otherwise, no job found
        const job = result.rows[0];
        if(!job) throw new NotFoundError(`No job with id: ${jobId}`)
    }
}

module.exports = Job;