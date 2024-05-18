"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError.js");
const Job = require("./job.js");
const { commonBeforeAll, commonAfterAll, 
    commonBeforeEach, commonAfterEach 
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/*************** create ****************/

describe("create", function() {
    const newJob = {
        title: "Test Job", 
        salary: 123000,
        equity: "0.001",
        companyHandle: "c1"
    };

    test("Works", async function() {
        let job = await Job.create(newJob);
        expect(job).toEqual({
            id: expect.any(Number),
            title: newJob.title,
            salary: newJob.salary,
            equity: newJob.equity,
            companyHandle: newJob.companyHandle,
        });

        const result = await db.query(
            `SELECT id, title, salary, equity, company_handle
            FROM jobs
            WHERE title = 'Test Job'`
        );
        expect(result.rows.length).toEqual(1);
    });

    test("BadRequestError if job has duplicate title", async function() {
        try{
            await Job.create(newJob);
            await Job.create(newJob);
            fail();
        }catch(e){
            expect( e instanceof BadRequestError).toBeTruthy();
        }
    })
})

/************* findAll *****************/

describe("findAll", function() {
    
    test("Works: no Filter", async function() {
        let jobs = await Job.findAll();
        expect(jobs).toEqual([
            {
                id: expect.any(Number),
                title: "Automotive Engineer", 
                salary: 33333,
                equity: "0.003",
                companyHandle: "c3"
            },
            {
                id: expect.any(Number),
                title: "Front Room Staff", 
                salary: 33333,
                equity: "0.003",
                companyHandle: "c3"
            },
            {
                id: expect.any(Number),
                title: "job title 1", 
                salary: 11111,
                equity: "0.001",
                companyHandle: "c1"
            },
            {
                id: expect.any(Number),
                title: "job title 2", 
                salary: 22222,
                equity: "0.002",
                companyHandle: "c2"
            },
            {
                id: expect.any(Number),
                title: "job title 3", 
                salary: 22222,
                equity: null,
                companyHandle: "c2"
            },
            {
                id: expect.any(Number),
                title: "job title 4", 
                salary: 22222,
                equity: "0",
                companyHandle: "c2"
            },
        ])
    })
    
    test("Works: filter by title", async function() {
        
        let filterParams = { title: "om" }

        let jobs = await Job.findAll(filterParams);
        expect(jobs).toEqual([
            {
                id: expect.any(Number),
                title: "Automotive Engineer", 
                salary: 33333,
                equity: "0.003",
                companyHandle: "c3"
            },
            {
                id: expect.any(Number),
                title: "Front Room Staff", 
                salary: 33333,
                equity: "0.003",
                companyHandle: "c3"
            },
        ])
    })
    
    test("Works: filter by minSalary", async function() {
        
        let filterParams = { minSalary: 30000 }

        let jobs = await Job.findAll(filterParams);
        expect(jobs).toEqual([
            {
                id: expect.any(Number),
                title: "Automotive Engineer", 
                salary: 33333,
                equity: "0.003",
                companyHandle: "c3"
            },
            {
                id: expect.any(Number),
                title: "Front Room Staff", 
                salary: 33333,
                equity: "0.003",
                companyHandle: "c3"
            },
        ])
    })
    
    test("Works: filter by hasEquity", async function() {
        
        let filterParams = { hasEquity: true }

        let jobs = await Job.findAll(filterParams);
        expect(jobs).toEqual([
            {
                id: expect.any(Number),
                title: "Automotive Engineer", 
                salary: 33333,
                equity: "0.003",
                companyHandle: "c3"
            },
            {
                id: expect.any(Number),
                title: "Front Room Staff", 
                salary: 33333,
                equity: "0.003",
                companyHandle: "c3"
            },
            {
                id: expect.any(Number),
                title: "job title 1", 
                salary: 11111,
                equity: "0.001",
                companyHandle: "c1"
            },
            {
                id: expect.any(Number),
                title: "job title 2", 
                salary: 22222,
                equity: "0.002",
                companyHandle: "c2"
            },
        ])
    })
    
    test("Works: multiple filters", async function() {
        
        let filterParams = { title: "ti", minSalary:30000, hasEquity: true }

        let jobs = await Job.findAll(filterParams);
        expect(jobs).toEqual([
            {
                id: expect.any(Number),
                title: "Automotive Engineer", 
                salary: 33333,
                equity: "0.003",
                companyHandle: "c3"
            }
        ])
    })
    
    test("Throw error when passed unexpected parameter", async function() {
        
        let filterParams = { bananas: "yes" }

        try{
            await Job.findAll(filterParams);

        }catch(e){
            expect(e instanceof ExpressError).toBeTruthy();
            expect(e.message).toEqual(`Invalid filter parameter: bananas`)
        }
        
    })
})

/***************** get *******************/

describe("get", function() {
    test("works", async function() {
        let testJob = await Job.create({
            title: "test",
            salary: 100000,
            equity: "0.003",
            companyHandle: "c1"
        });
        let job = await Job.get(testJob.id);
        
        expect(job).toEqual({
            id: expect.any(Number),
            title: expect.any(String),
            salary: expect.any(Number),
            equity: expect.any(String),
            companyHandle: expect.any(String),
        })
    })

    test("NotFoundError if id doesn't match any in database", async function() {
        try{
            await Job.get(99999);
        }catch(e){
            expect(e instanceof NotFoundError).toBeTruthy();
        }
    })
})

describe("update", function() {
    // update should take {title, salary, equity}, but never changes 
    // id or companyHandle
    const updateData = {
        title: "Updated job title",
        salary: 66666,
        equity: "0.666"
    }
    const testJob = {
        title: "Test Job Update", 
        salary: 123000,
        equity: "0.001",
        companyHandle: "c1"
    };
    
    test("Works", async function(){
        let job = await Job.create(testJob);

        let updatedJob = await Job.update(job.id, updateData);

        expect(updatedJob).toEqual({
            id: job.id,
            companyHandle: job.companyHandle,
            ...updateData
        })
    })
    
    test("Works with partial update", async function(){
        let job = await Job.create(testJob);
        let partialUpdate = {salary: 3333}

        let updatedJob = await Job.update(job.id, partialUpdate);

        expect(updatedJob).toEqual({
            id: job.id,
            title: job.title,
            salary: partialUpdate.salary,
            equity: job.equity,
            companyHandle: job.companyHandle,
        })
    })
    
    test("NotFoundError when id doesn't match any in database", async function(){
        try{
            await Job.update(99999, updateData);
            fail();
        } catch(e){
            expect(e instanceof NotFoundError).toBeTruthy();
        }
    })
    test("BadRequestError when passed no data to update", async function(){
        try{
            let job = await Job.create(testJob);
            await Job.update(job.id, {});
            fail();
        } catch(e){
            expect(e instanceof BadRequestError).toBeTruthy();
        }
    })
})

/************* remove *************/

describe("remove", function(){
    const testJob = {
        title: "Test Job Update", 
        salary: 123000,
        equity: "0.001",
        companyHandle: "c1"
    };

    test("works", async function() {
        let job = await Job.create(testJob);
        let job1 = await Job.get(job.id);

        expect(job1).toEqual({
            ...job
        });

        await Job.remove(job1.id);
        const res = await db.query(
            "SELECT * FROM jobs WHERE id=1");
        expect(res.rows.length).toEqual(0);
    });
})