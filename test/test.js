require('dotenv').config();

var supertest = require("supertest");
var should = require("should");

// This agent refers to PORT where the program is running.
var server = supertest.agent(`http://localhost:${process.env.PORT}`);
console.log(process.env.PORT)
// UNIT test begin

describe("SAMPLE unit test",function(){

  // #1 should return home page
  it("should return home page",function(done){
    // calling home page
    server
    .get("/")
    .expect("Content-type",/text/)
    .expect(200) // THis is HTTP response
    .end(function(err,res){
      // HTTP status should be 200
      res.status.should.equal(200);
      done();
    });
  });

});