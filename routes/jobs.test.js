"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const Job = require("../models/job");

const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
    u1Token,
    adminToken
  } = require("./_testCommon");
const { update } = require("../models/company");
const { BadRequestError } = require("../expressError");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/** POST /jobs ***********************/

describe("POST /jobs", function() {
    const newJob = {
        title: "Test Create Job", 
        salary: 50000,
        equity: 0.002,
        companyHandle: "c2"
    }

    // Should ONLY work for admin
    test("Ok for admin", async function() {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization",`Bearer ${adminToken}`);
        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({
            job: {
                ...newJob,
                equity: "0.002",
                id: expect.any(Number)
            }
        })
    })

    // Should throw error if not admin
    test("Unauthorized for regular user", async function() {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob)
            .set("authorization",`Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
    })

    // Should throw error if not logged in
    test("Unauthorized if not logged in", async function() {
        const resp = await request(app)
            .post("/jobs")
            .send(newJob);
        expect(resp.statusCode).toEqual(401);
    })

    test("BadRequestError if passed no data", async function() {
        const resp = await request(app)
            .post("/jobs")
            .set("authorization",`Bearer ${adminToken}`);
        expect(resp.statusCode).toEqual(400);
    })

    test("BadRequestError if passed partial data", async function() {
        const resp = await request(app)
            .post("/jobs")
            .send({
                title: "Partial data should fail to create"
            })
            .set("authorization",`Bearer ${adminToken}`);
        expect(resp.statusCode).toEqual(400);
    })

    test("BadRequestError if salary less than 0", async function() {
        const resp = await request(app)
            .post("/jobs")
            .send({
                title: "Testing Negative Salary",
                salary: -1000,
                equity: 0.002
            })
            .set("authorization",`Bearer ${adminToken}`);
        expect(resp.statusCode).toEqual(400);
    })

    test("BadRequestError if equity greater than 1.0", async function() {
        const resp = await request(app)
            .post("/jobs")
            .send({
                title: "Testing Large Equity",
                salary: 1000,
                equity: 1.2
            })
            .set("authorization",`Bearer ${adminToken}`);
        expect(resp.statusCode).toEqual(400);
    })
})

/** GET /jobs *************************/

describe("GET /jobs", function() {

    test("works for anyone", async function() {
        const resp = await request(app)
        .get("/jobs");

        expect(resp.statusCode).toEqual(200);
        expect(resp.body).toEqual({
            jobs: [
                {
                    id: expect.any(Number),
                    title: "Test Job",
                    salary: 111111,
                    equity: "0.001",
                    companyHandle: "c1"
                },
                {
                    id: expect.any(Number),
                    title: "Test Job 2",
                    salary: 22222,
                    equity: "0.002",
                    companyHandle: "c2"
                },
                {
                    id: expect.any(Number),
                    title: "Test Job 3",
                    salary: 33333,
                    equity: "0.003",
                    companyHandle: "c3"
                }
            ]
        })
    })
})

/** GET /jobs/:jobId *************************/

describe("GET /jobs/:jobId", function() {

    test("works for anyone", async function() {
        const resp = await request(app)
        .get("/jobs/1");

        expect(resp.statusCode).toEqual(200);
        expect(resp.body).toEqual({
            job:
                {
                    id: expect.any(Number),
                    title: "Test Job",
                    salary: 111111,
                    equity: "0.001",
                    companyHandle: "c1"
                }
        })
    })

    test("NotFoundError if ID not found", async function() {
        const resp = await request(app)
        .get("/jobs/99999");

        expect(resp.statusCode).toEqual(404);
    })
})

/** PATCH /jobs/:id *********************/

describe("PATCH /jobs/jobId", function() {
    
    test("Works for admin", async function() {
        const queryJob = await db.query(`
        SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs 
        WHERE title = 'Test Job'`);

        const testJob = queryJob.rows[0];
        let updateData = {
            title: "Update Job Title", 
            salary: 44444,
            equity: 0.121
        }
        
        const resp = await request(app)
            .patch(`/jobs/${testJob.id}`)
            .send(updateData)
            .set("authorization", `Bearer ${adminToken}`);
        
        expect(resp.statusCode).toEqual(200);
        expect(resp.body).toEqual({
            job: {
                id: testJob.id,
                ...updateData,
                equity: `${updateData.equity}`,
                companyHandle: testJob.companyHandle
            }
        });
    });
    
    test("Unauthorized for regular users", async function() {
        const queryJob = await db.query(`
        SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs 
        WHERE title = 'Test Job'`);

        const testJob = queryJob.rows[0];
        let updateData = {
            title: "Update Job Title", 
            salary: 44444,
            equity: 0.121
        }
        
        const resp = await request(app)
            .patch(`/jobs/${testJob.id}`)
            .send(updateData)
            .set("authorization", `Bearer ${u1Token}`);
        
        expect(resp.statusCode).toEqual(401);
    });
    
    test("Unauthorized if not logged in", async function() {
        const queryJob = await db.query(`
        SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs 
        WHERE title = 'Test Job'`);

        const testJob = queryJob.rows[0];
        let updateData = {
            title: "Update Job Title", 
            salary: 44444,
            equity: 0.121
        }
        
        const resp = await request(app)
            .patch(`/jobs/${testJob.id}`)
            .send(updateData);
        
        expect(resp.statusCode).toEqual(401);
    });

    test("Works for partial updates", async function() {
        const queryJob = await db.query(`
        SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs 
        WHERE title = 'Test Job'`);

        const testJob = queryJob.rows[0];
        let updateData = {
            title: "Update Job Title", 
        }
        
        const resp = await request(app)
            .patch(`/jobs/${testJob.id}`)
            .send(updateData)
            .set("authorization", `Bearer ${adminToken}`);
        
        expect(resp.statusCode).toEqual(200);
        expect(resp.body).toEqual({
            job: {
                id: testJob.id,
                title: updateData.title,
                salary: testJob.salary,
                equity: `${testJob.equity}`,
                companyHandle: testJob.companyHandle
            }
        });
    });

        
    test("BadRequestError if Salary Negative", async function() {
        const queryJob = await db.query(`
        SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs 
        WHERE title = 'Test Job'`);

        const testJob = queryJob.rows[0];
        let updateData = {
            title: "Update Job Title", 
            salary: -44444,
            equity: 0.121
        }
        
        try{
            await request(app)
                .patch(`/jobs/${testJob.id}`)
                .send(updateData)
                .set("authorization", `Bearer ${adminToken}`);
            
        } catch(e) {
            expect(e instanceof BadRequestError).toBeTruthy();
        }
    });
        
    test("BadRequestError if Equity Greater Than 1.0", async function() {
        const queryJob = await db.query(`
        SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs 
        WHERE title = 'Test Job'`);

        const testJob = queryJob.rows[0];
        let updateData = {
            title: "Update Job Title", 
            salary: 44444,
            equity: 1.121
        }
        
        try{
            await request(app)
                .patch(`/jobs/${testJob.id}`)
                .send(updateData)
                .set("authorization", `Bearer ${adminToken}`);
            
        } catch(e) {
            console.log(e);
            expect(e instanceof BadRequestError).toBeTruthy();
        }
    });
})

describe("DELETE /jobs/jobId", function() {
    
    test("Works for admin", async function() {
        const queryJob = await db.query(`
        SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs
        WHERE title = 'Test Job'`);

        const testJob = queryJob.rows[0];
        const deletedId = testJob.id;
        
        const resp = await request(app)
        .delete(`/jobs/${deletedId}`)
        .set("authorization", `Bearer ${adminToken}`);
        expect(resp.statusCode).toEqual(200);
        expect(resp.body).toEqual({ deleted: `${deletedId}` });
    });

    test("Unauthorized for regular users", async function() {
        const queryJob = await db.query(`
        SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs
        WHERE title = 'Test Job'`);

        const testJob = queryJob.rows[0];
        const deletedId = testJob.id;
        
        const resp = await request(app)
        .delete(`/jobs/${deletedId}`)
        .set("authorization", `Bearer ${u1Token}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("Unauthorized if not logged in", async function() {
        const queryJob = await db.query(`
        SELECT id, title, salary, equity, company_handle AS "companyHandle"
        FROM jobs
        WHERE title = 'Test Job'`);

        const testJob = queryJob.rows[0];
        const deletedId = testJob.id;
        
        const resp = await request(app)
        .delete(`/jobs/${deletedId}`);
        expect(resp.statusCode).toEqual(401);
    });

    test("BadRequestError if id doesn't exist", async function() {
        try{
            const resp = await request(app)
            .delete(`/jobs/999999`)
            .set("authorization", `Bearer ${adminToken}`);
        }catch(e){
            expect(e instanceof BadRequestError).toBeTruthy();
        }
    });
});