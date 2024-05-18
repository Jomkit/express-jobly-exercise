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

    /** Find all jobs */
    static async findAll(){
        const results = await db.query(`
        SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs
        `);

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
        console.log(updateData);
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