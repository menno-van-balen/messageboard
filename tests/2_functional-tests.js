const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  // 10 Tests
  
  let testThreadId
  let testReplyId
  let testPass = 'testpass'
  let wrongPass = 'wrong'
  let board = 'test'
  let text = 'Functional Test Thread'
    
  test('Create a New Thread', (done) => {
    chai.request(server)
    .post('/api/threads/test')
    .send({
      board: board,
      text: text,
      delete_password: testPass
    })
    .end((err, res) => {
      assert.equal(res.status, 200)
      let createdThreadId = res.redirects[0].split('/')[res.redirects[0].split('/').length - 1]
      testThreadId = createdThreadId
      done()
    })
  })

  test('Post a reply on a Thread', (done) => {
    chai.request(server)
    .post('/api/replies/' + board)
    .send({
      thread_id: testThreadId,
      text: 'Test Reply from Functional Test',
      delete_password: testPass
    })
    .end((err, res) => {
      assert.equal(res.status, 200)
      let createdReplyId =  res.redirects[0].split('=')[res.redirects[0].split('=').length - 1]
      testReplyId = createdReplyId
      done()
    })
  })

  test('Vieuwing 10 most recent threads', (done) => {
    chai.request(server)
    .get('/api/threads/' + board)
    .send()
    .end((err, res) => {
      assert.equal(res.status, 200)
      assert.exists(res.body[0], "There is a thread")
      assert.equal(res.body[0].text, text)
      done()
    })
  })

  test('Get Replies on a Thread', (done) => {
    chai.request(server)
    .get('/api/replies/' + board)
    .query({thread_id: testThreadId})
    .send()
    .end((err, res) => {
      let thread = res.body
      assert.equal(thread._id, testThreadId)
      assert.isUndefined(thread.delete_password)
      assert.isArray(thread.replies)
      done()
    })
  })

  test('Delete a Reply on a Thread, wrong password', (done) => {
    chai.request(server)
      .delete('/api/replies/' + board)
      .send({
        thread_id: testThreadId,
        reply_id: testReplyId,
        delete_password: wrongPass
      })
      .end((err, res) => {
        assert.equal(res.body, 'incorrect password')
        done()
      })
  })

  test('Delete a Reply on a Thread, right password', (done) => {
    chai.request(server)
      .delete('/api/replies/' + board)
      .send({
        thread_id: testThreadId,
        reply_id: testReplyId,
        delete_password: testPass
      })
      .end((err, res) => {
        assert.equal(res.body, 'success')
        done()
      })
  })

  test('Report a Thread', (done) => {
    chai.request(server)
      .put('/api/threads/' + board)
      .send({
        thread_id: testThreadId,
      })
      .end((err, res) => {
        assert.equal(res.body, 'success')
        done()
      })
  })

  test('Report a Reply on a Thread', (done) => {
    chai.request(server)
      .put('/api/replies/' + board)
      .send({
        thread_id: testThreadId,
        reply_id: testReplyId
      })
      .end((err, res) => {
        assert.equal(res.body, 'success')
        done()
      })
  })

  test('Delete a Thread, wrong password', (done) => {
    chai.request(server)
      .delete('/api/threads/' + board)
      .send({
        thread_id: testThreadId,
        delete_password: wrongPass
      })
      .end((err, res) => {
        assert.equal(res.body, 'incorrect password')
        done()
      })
  })

  test('Delete a Thread, right password', (done) => {
    chai.request(server)
      .delete('/api/threads/' + board)
      .send({
        thread_id: testThreadId,
        delete_password: testPass
      })
      .end((err, res) => {
        assert.equal(res.body, 'success')
        done()
      })
  })

});
