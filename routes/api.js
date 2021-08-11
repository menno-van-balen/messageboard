'use strict';

const mongodb = require('mongodb');
const mongoose = require('mongoose');

module.exports = function (app) {

  const uri = 'mongodb+srv://menno-van-balen:'+ process.env.Pass +'@cluster0.ypqou.mongodb.net/board?retryWrites=true&w=majority';
  mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  // Schema's
  const replySchema = new mongoose.Schema({
    text: {type: String, required: true},
    delete_password: {type: String, required: true},
    created_on : {type: Date, required: true},
    reported: {type: Boolean, required: true}
  })

  const threadSchema = new mongoose.Schema({
    text: {type: String, required: true},
    delete_password: {type: String, required: true},
    board: {type: String, required: true},
    created_on: {type: Date, required: true},
    bumped_on: {type: Date, required: true},
    reported: {type: Boolean, required: true},
    replies: [replySchema]
  })

  // Models
  const Reply = mongoose.model('Reply', replySchema)
  const Thread = mongoose.model('Thread', threadSchema)

  // Routes
  app.post('/api/threads/:board', (request, response) => {
    let newThread = new Thread(request.body)
    if(!newThread.board || newThread.board === ''){
      newThread.board = request.params.board
    }
    newThread.created_on = new Date().toUTCString()
    newThread.bumped_on = new Date().toUTCString()
    newThread.reported = false
    newThread.save((error, savedThread) => {
      if(!error && savedThread){
        return response.redirect('/b/' + savedThread.board + '/' + savedThread.id)
      }
    })
  });

  app.post('/api/replies/:board', (request, response) => {
    let newReply = new Reply({
      text: request.body.text,
      delete_password: request.body.delete_password
    })
    newReply.created_on = new Date().toUTCString()
    newReply.reported = false

    Thread.findByIdAndUpdate(
      request.body.thread_id,
      {$push: {replies: newReply}, bumped_on: new Date().toUTCString()},
      {new: true},
      (error, updatedThread) => {
        if(!error && updatedThread){
          response.redirect('/b/' + updatedThread.board + '/' + updatedThread.id + '?new_reply_id=' + newReply.id)
        }
      }
    )
  });

  app.get('/api/threads/:board', (request, response) => {	
    Thread.find({board: request.params.board})
      .sort({bumped_on: 'desc'})
      .limit(10)
      .select('-delete_password -reported')
      .lean()
      .exec((error, arrayOfThreads) => {
        if(!error && arrayOfThreads){
          arrayOfThreads.forEach((thread) => {					
            thread['replycount'] = thread.replies.length

            // Sort replies by date
            thread.replies.sort((thread1, thread2) => {
              return thread2.created_on - thread1.created_on
            })

            // Limit replies to 3
            thread.replies = thread.replies.slice(0, 3)

            // Remove delete pass from replies
            thread.replies.forEach((reply) => {
              reply.delete_password = undefined
              reply.reported = undefined
            })
          })
          return response.json(arrayOfThreads)
        }
      })
  })

  app.get('/api/replies/:board', (request, response) => {
    Thread.findById(
      request.query.thread_id,
      (error, thread) => {
        if(!error && thread){
          thread.delete_password = undefined
          thread.reported = undefined

          // Sort replies by date
          thread.replies.sort((thread1, thread2) => {
            return thread2.created_on - thread1.created_on
          })

          // Remove delete pass from replies
          thread.replies.forEach((reply) => {
            reply.delete_password = undefined
            reply.reported = undefined
          })
          return response.json(thread)
        }
      }
    )    
  })

  app.delete('/api/threads/:board', (request, response) => {
    Thread.findById(
      request.body.thread_id,
      (error, threadToDelete) => {
        if(!error && threadToDelete) {
          if(threadToDelete.delete_password === request.body.delete_password) {
            Thread.findByIdAndRemove(
              request.body.thread_id,
              (error, deletedThread) => {
                if(!error && deletedThread){
                  return response.json('success')
                }
              }
            )
          } else {
            return response.json('incorrect password')
          }
        }
      }
    )
  })

  app.delete('/api/replies/:board', (request, response) => {		
    Thread.findById(
      request.body.thread_id,
      (error, threadToUpdate) => {
        if(!error && threadToUpdate) {
          for(let i = 0; i < threadToUpdate.replies.length; i++) {
            if(threadToUpdate.replies[i].id === request.body.reply_id) {
              if(threadToUpdate.replies[i].delete_password === request.body.delete_password) {
                threadToUpdate.replies[i].text = '[deleted]';
                threadToUpdate.save((error, updatedThread) => {
                  if(!error && updatedThread){
                    return response.json('success')
                  } else {
                    console.log(error)
                  }
                })
              } else {
                return response.json('incorrect password')
              }
            }        
          }
        } else {
          return response.json('thread not found')
        }
      }
    )
  })

  app.put('/api/threads/:board', (request, response) => {
    Thread.findByIdAndUpdate(
      request.body.thread_id,
      {reported: true},
      {new: true},
      (error, updatedThread) => {
        if(!error && updatedThread){
          return response.json('success')
        }
      }
    )
  })

  app.put('/api/replies/:board', (request, response) => {
		Thread.findById(
			request.body.thread_id,
			(error, threadToUpdate) => {
        if(!error && threadToUpdate) {
          for (let i = 0; i < threadToUpdate.replies.length; i++) {
            if(threadToUpdate.replies[i].id === request.body.reply_id){
              threadToUpdate.replies[i].reported = true;
              threadToUpdate.save((error, updatedThread) => {
                if(!error && updatedThread){
                  return response.json('success')
                }
              })
            }
          }
        }
			}
		)
	})

};
