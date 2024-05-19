"use strict";

/** Routes for jobs */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, isAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");

const router = new express.Router();

/** POST / { job } => { job }
 * 
 * job should be { title, salary, equity, companyHandle }
 * 
 * returns { id, title, salary, equity, companyHandle }
 * 
 * Authorization: login, admin
 */

router.post("/", ensureLoggedIn, isAdmin, async function (req, res, next) {
    try{
        const validator = jsonschema.validate(req.body, jobNewSchema);
        if(!validator.valid){
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Job.create(req.body);
        return res.status(201).json({ job });
        
    }catch(e) {
        return next(e);
    }
})

/** GET / => gets all jobs
 * { jobs: [{ id, title, salary, equity, companyHandle}, ...]}
 * 
 * Filter functionality: implemented in job model findAll(req.query)
 * 
 * Authorization: None
 */
router.get("/", async function (req, res, next) {
    try{
        const jobs = await Job.findAll(req.query);

        return res.json({ jobs });
    } catch(e) {
        return next(e);
    }
})

/** GET /jobId => gets a job by id
 * { job: { id, title, salary, equity, companyHandle} }
 * 
 * Authorization: None
 */
router.get("/:jobId", async function (req, res, next) {
    try{
        const job = await Job.get(req.params.jobId);

        return res.json({ job });
    } catch(e) {
        return next(e);
    }
})

/** PATCH /[id] {fld1, fld2, ... } => { job }
 * 
 * Patches job data.
 * 
 * Fields can be: { title, salary, equity }
 * 
 * returns { id, title, salary, equity, companyHandle }
 * Authorization: login, admin
 */
router.patch("/:jobId", ensureLoggedIn, isAdmin, async function (req, res, next) {
    try{
        const validator = jsonschema.validate(req.body, jobUpdateSchema);
        if(!validator.valid){
            const errs = Validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Job.update(req.params.jobId, req.body);
        return res.json({ job });
    }catch(e){
        return next(e);
    }
})

/** DELETE /[id] => { deleted: id } 
 * 
 * authorization: login, admin
*/

router.delete("/:jobId", ensureLoggedIn, isAdmin, async function(req, res, next) {
    try{
        await Job.remove(req.params.jobId);

        return res.json({ deleted: req.params.jobId });
    }catch(e) {
        return next(e);
    }
})


module.exports = router;