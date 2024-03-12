const express=require('express')
const app=express()
const QRCode = require('qrcode')
const bodyParser=require('body-parser')
const path=require('path')
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const session=require('express-session')
const mongodb=require('mongodb');
const {MongoClient}=require('mongodb')
const uri = "mongodb+srv://vcsb:gitamlib@cluster0.ca9h3l6.mongodb.net/?retryWrites=true&w=majority";
const NodeCache = require('node-cache');
const cache = new NodeCache();
const jwt = require('jsonwebtoken');
const secretKey = 'YourSecretKey';

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

function encryptData(data) {
  const encryptedData = jwt.sign(data, secretKey);
  return encryptedData;
}


function decryptData(encryptedData) {
  const decryptedData = jwt.verify(encryptedData, secretKey);
  return decryptedData;
}


client.connect((err) => {
  if (err) {
    console.log("line 57")
    res.sendFile(path.join(__dirname+'/error.html'))
  }
  console.log('Connected to MongoDB Atlas');
  db = client.db('gitamlibproject').collection('project-phase2')
});


app.use(session({
    secret: 'hellllloooo',
    resave: false,
    saveUninitialized: false
  }));
  
  // Initialize Passport.js
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(bodyParser.json({limit:'130mb'}))
  app.use(bodyParser.urlencoded({limit:'130mb',extended:true}))
  passport.use(
    new GoogleStrategy(
      {
        clientID: '234673302290-ic1oma4gm5cqkh33esukoej7tgpdnq43.apps.googleusercontent.com',
        clientSecret: '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',
        callbackURL: 'https://gitam-resource-library-management-system.onrender.com/auth/google/callback'
      },
      (accessToken, refreshToken, profile, done) => {
        done(null, profile);
      }
    )
  );
  
  passport.serializeUser((user, done) => {
    done(null, user);
  });
  
  passport.deserializeUser((user, done) => {
    done(null, user);
  });

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    async(req, res) => {
        if(req['user']['_json']['email']=='banuma@gitam.in'){
            res.sendFile(path.join(__dirname,'/studentinterface.html'));
        }else if(req['user']['_json']['email']=='schitloo@gitam.in' && req['user']['_json']['hd']=='gitam.in'){
            res.sendFile(path.join(__dirname,'/librarian.html'))
        }else{
            res.send("Invalid user")
        }

    })

app.get('/',(req,res)=>{
res.sendFile(path.join(__dirname,'/signin.html'))
})

app.post('/signin',(req,res)=>{
    return res.redirect('/auth/google')
})
//sath
app.post('/qr',async(req,res)=>{
    const decodetext = req.body['decodetext'];

// Remove leading and trailing whitespace and then split on \n
const book = decodetext.trim().split("$");

const bookname = book[0];
const bookid = book[1];
const name=req['user']['_json']['given_name'];
const roll=req['user']['_json']['family_name']
const email=req['user']['_json']['email']
const doc=await db.findOne({Name:name,Rollno:roll,Email:email});
if(!doc){
  const currentDate = new Date();
  const curryear = currentDate.getFullYear();
  const currmonth = currentDate.getMonth() + 1; 
  const currday = currentDate.getDate();

  const book={
    Name:req['user']['_json']['given_name'],
    Rollno:req['user']['_json']['family_name'],
    Email:req['user']['_json']['email'],
    Book0:{BookName:bookname,
          Bookid:bookid,
          status:'pending',
          Borrowed:`${currday}/${currmonth}/${curryear}`
    }
  }


  await db.insertOne(book);
  const lib=await db.findOne({Role:'librarian'})

  if(Object.keys(lib['pending']).length===0){
    const student={ Name:req['user']['_json']['given_name'],
    Rollno:req['user']['_json']['family_name'],
    Email:req['user']['_json']['email'],
    BookName:bookname,
    Bookid:bookid,
    status:'pending',
    Borrowed:`${currday}/${currmonth}/${curryear}`}

  const update = { $set: { 'pending.Book0': student } }
      await db.updateOne({Role:'librarian'}, update);
  }
  else{

    const len = Object.keys(lib.pending);
      const last = len[len.length - 1];
      const match = last.match(/\d+/);
      const number = parseInt(match[0]) + 1;
      const b = "pending.Book" + number;

      const student={ Name:req['user']['_json']['given_name'],
      Rollno:req['user']['_json']['family_name'],
      Email:req['user']['_json']['email'],
      BookName:bookname,
      Bookid:bookid,
      status:'pending',
      Borrowed:`${currday}/${currmonth}/${curryear}`}
  
      const update = {
        $set: {}
    };
    update.$set[b] = student;
    
    await db.updateOne({ Role: 'librarian' }, update);
  }

}
else{
  console.log("user exists")
  const currentDate = new Date();
  const curryear = currentDate.getFullYear();
  const currmonth = currentDate.getMonth() + 1; 
  const currday = currentDate.getDate();

  const len = Object.keys(doc);
  const last = len[len.length - 1];
  const match = last.match(/\d+/);
  const number = parseInt(match[0]) + 1;
  const b = "Book" + number;

  const bookKeys = Object.keys(doc).filter(key => key.startsWith('Book'));
  var bookids=[];
  bookKeys.forEach(bookKey => {
    const subElement = doc[bookKey];
    if (subElement && subElement.Bookid) {
      bookids.push(subElement.Bookid);

    }
  });
  if (bookids.includes(bookid)) {
    res.send("The book is already taken by you")
    console.log(`${bookid} is already present in bookids list`);
} else {
  const book={BookName:bookname,
    Bookid:bookid,
    status:'pending',
    Borrowed:`${currday}/${currmonth}/${curryear}`
  }
  const update = {
    $set: {}
};
update.$set[b] = book;
await db.updateOne(doc, update);
const lib=await db.findOne({Role:'librarian'})
if(Object.keys(lib['pending']).length===0){
  const student={ Name:req['user']['_json']['given_name'],
  Rollno:req['user']['_json']['family_name'],
  Email:req['user']['_json']['email'],
  BookName:bookname,
  Bookid:bookid,
  status:'pending',
  Borrowed:`${currday}/${currmonth}/${curryear}`}

const update = { $set: { 'pending.Book0': student } }
    await db.updateOne({Role:'librarian'}, update);
}
else{
  const len = Object.keys(lib.pending);
    const last = len[len.length - 1];
    const match = last.match(/\d+/);
    const number = parseInt(match[0]) + 1;
    const b = "pending.Book" + number;

    const student={ Name:req['user']['_json']['given_name'],
    Rollno:req['user']['_json']['family_name'],
    Email:req['user']['_json']['email'],
    BookName:bookname,
    Bookid:bookid,
    status:'pending',
    Borrowed:`${currday}/${currmonth}/${curryear}`}

    const update = {
      $set: {}
  };
  update.$set[b] = student;
  
  await db.updateOne({ Role: 'librarian' }, update);
}
}
}
})

app.post('/qrgenerating',(req,res)=>{
  res.sendFile(path.join(__dirname+'/qrgenerating.html'))
})

app.post('/qrgenerate', (req, res) => {
  let data = req.body.bookname;
  let data1 = req.body.bookid;
  let combinedData = data + '$' + data1;
  let stringData = JSON.stringify(combinedData);

  // Print the QR code to terminal

      // Convert the data into base64
      QRCode.toDataURL(stringData, function (err, code) {
          if (err) return res.status(500).send("Error occurred");

          // Send HTML response with QR code image
          res.send(`
              <!DOCTYPE html>
              <html lang="en">
              <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>QR Generator</title>
              </head>
              <body>
                  <img src="${code}" alt="QR Code"/>
              </body>
              </html>
          `);
      });
  
});

app.post('/approve',async(req,res)=>{
  const doc=await db.findOne({Role:"librarian"})
  var html=`<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>QR Generator</title>
  </head>
  <body>
  `
  const pending=doc['pending'];
  for (let key in pending) {
      const value = pending[key];
      console.log(value['status'])
      if(value['status']=='pending for return'){
        html+=`<p>request for return</p><form action="/reqforret" method="post">
        <p>${value['Name']} ${value['Rollno']} ${value['BookName']}</p>
        <input type="hidden" value="${key}" name="bookid">
        <input type="submit" value="Return Request">
        </form>`
      }
      else{
      html+=` <form action="/approved" method="post">
      <p>${value['Name']} ${value['Rollno']} ${value['BookName']}</p>
      <input type="hidden" value="${key}" name="bookid">
      <input type="submit" value="approve">
      </form>`}
      
  }
  html+=`</body>
  </html>`;
  res.send(html)
})


app.get('/approve',async(req,res)=>{
  const doc=await db.findOne({Role:"librarian"})
  var html=`<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>QR Generator</title>
  </head>
  <body>
  `
  const pending=doc['pending'];
  
  for (let key in pending) {
      const value = pending[key];
      console.log(value['status'])
      if(value['status']=='pending for return'){
        html+=`<p>request for return</p><form action="/reqforret" method="post">
        <p>${value['Name']} ${value['Rollno']} ${value['BookName']}</p>
        <input type="hidden" value="${key}" name="bookid">
        <input type="submit" value="Return request">
        </form>`
      }   
      else{
      html+=` <form action="/approved" method="post">
      <p>${value['Name']} ${value['Rollno']} ${value['BookName']}</p>
      <input type="hidden" value="${key}" name="bookid">
      <input type="submit" value="approve">
      </form>`}
      
  }
  html+=`</body>
  </html>`;
  res.send(html)
})





app.post('/reqforret',async(req,res)=>{
  const doc = await db.findOne({ Role: "librarian" });
  console.log(doc)
const bookid1 = req.body.bookid;
console.log(bookid1);
const b = `pending.${bookid1}`; // Constructing the exact field to u
console.log(b)
var r = doc['pending'][bookid1];
console.log(r)
const unsetObject = {};
unsetObject[b] = '';

const result = await db.updateOne(
    { Role: "librarian" },
    { $unset: unsetObject }
);
const currentDate = new Date();
const curryear = currentDate.getFullYear();
const currmonth = currentDate.getMonth() + 1; 
const currday = currentDate.getDate();
const id=r['Bookid'];
const stu = await db.findOne({ Rollno:r['Rollno'] });
const bookKeys = Object.keys(stu).filter(key => key.startsWith('Book'));

console.log(id);
console.log("break")
bookKeys.forEach(async bookKey => {
  const book=stu[bookKey]['Bookid'];
  console.log(book)
  if(id==book){
    stu[bookKey]['Returned']=`${currday}/${currmonth}/${curryear}`;
    stu[bookKey]['status']="Returned";
    const setObject = {};
    setObject[bookKey] = stu[bookKey];
    const setResult = await db.updateOne(
      { Rollno:  r['Rollno'] },
      { $set: setObject }
  );
  }

})


r['Returned']=`${currday}/${currmonth}/${curryear}`;
r['status']="Returned";
if(Object.keys(doc['Approved']).length===0){
 const setObject = {};
  setObject['Approved.Book0'] = r;

  // Update the document to set the book in approve
  const setResult = await db.updateOne(
      { Role: "librarian" },
      { $set: setObject }
  );

}else{
const len = Object.keys(doc.Approved);
const last = len[len.length - 1];
const match = last.match(/\d+/);
const number = parseInt(match[0]) + 1;
const b = "Approved.Book" + number;

const setObject = {};
setObject[b] = r;

const setResult = await db.updateOne(
    { Role: "librarian" },
    { $set: setObject }
);
}

})


app.post('/approved',async(req,res)=>{
  const doc = await db.findOne({ Role: "librarian" });
    const appr = req.body.bookid;
    const pendingField = `pending.${appr}`;
    const appbook=doc.pending.appr;
    
    // Create a dynamic object to specify the field to unset
    const unsetObject = {};
    unsetObject[pendingField] = '';

    const result = await db.updateOne(
        { Role: "librarian" },
        { $unset: unsetObject }
    );

    if(Object.keys(doc['Approved']).length===0){
      const ob={
        Name:doc['pending'][appr]['Name'],
        Rollno:doc['pending'][appr]['Rollno'],
        Email:doc['pending'][appr]['Email'],
        BookName:doc['pending'][appr]['BookName'],
        Bookid:doc['pending'][appr]['Bookid'],
        status:'approved',
        Borrowed:doc['pending'][appr]['Borrowed']
      }
      

     const setObject = {};
      setObject['Approved.Book0'] = ob;
  
      // Update the document to set the book in approve
      const setResult = await db.updateOne(
          { Role: "librarian" },
          { $set: setObject }
      );
  
    }else{
    const len = Object.keys(doc.Approved);
    const last = len[len.length - 1];
    const match = last.match(/\d+/);
    const number = parseInt(match[0]) + 1;
    const b = "Approved.Book" + number;
    const ob={
      Name:doc['pending'][appr]['Name'],
      Rollno:doc['pending'][appr]['Rollno'],
      Email:doc['pending'][appr]['Email'],
      BookName:doc['pending'][appr]['BookName'],
      Bookid:doc['pending'][appr]['Bookid'],
      status:'approved',
      Borrowed:doc['pending'][appr]['Borrowed']
    }
   const setObject = {};
    setObject[b] = ob;

    // Update the document to set the book in approve
    const setResult = await db.updateOne(
        { Role: "librarian" },
        { $set: setObject }
    );

    }
    const rollno=doc['pending'][appr]['Rollno'];
    const user=await db.findOne({Rollno:rollno});
    const bookid=doc['pending'][appr]['Bookid'];
    const bookKeys = Object.keys(user).filter(key => key.startsWith('Book'));
    bookKeys.forEach(async bookKey => {
      const book=user[bookKey]['Bookid'];
      if(bookid==book){
        const updateResult = await db.updateOne(
          { Rollno: rollno, [`${bookKey}.Bookid`]: bookid },
          { $set: { [`${bookKey}.status`]: 'approved' } }
      );
      }
   })
   res.redirect('/approve')
  }
 


)


app.post('/history',async(req,res)=>{
  const rollno=req.user._json.family_name;
  const doc=await db.findOne({Rollno:rollno})
  var html=`<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document</title>
  </head>
  <body><h1>Books Yet to approve</h1>`
  const bookKeys = Object.keys(doc).filter(key => key.startsWith('Book'));
  bookKeys.forEach(async bookKey => {
    if(doc[bookKey]['status']=='pending'){
      html+=`<p>${doc[bookKey]['BookName']}${doc[bookKey]['Bookid']}</p>`
    }
  })
  html+=`<h1>Books Approved</h1>`;
  const currentDate = new Date();
  const curryear = currentDate.getFullYear();
  const currmonth = currentDate.getMonth() + 1; 
  const currday = currentDate.getDate();
  

  bookKeys.forEach(async bookKey => {
    if(doc[bookKey]['status']=='approved'){
      const borrow=doc[bookKey]['Borrowed'];
      const parts = borrow.split('/');
     const givenDate = new Date(parts[2], parts[1] - 1, parts[0])
     const differenceInDays = Math.floor((currentDate - givenDate) / (1000 * 60 * 60 * 24))
     if (differenceInDays==0 || differenceInDays==11){
      html+=`<p>${doc[bookKey]['BookName']}${doc[bookKey]['Bookid']} 
      <form action="/renew" method="post">
      <input type="hidden" value="${bookKey}" name="bookid">
      <input type="submit" value="renew">
      </form>
      <form action="/return" method="post">
        <input type="hidden" value="${bookKey}" name="bookid">
        <input type="submit" value="return">
    </form>
      </p>`
     }
     else if(differenceInDays>12) {
      const fine=differenceInDays*100
      html+=`<p>${doc[bookKey]['BookName']}${doc[bookKey]['Bookid']} fine:${fine}</p>`
     }
     else if(differenceInDays<10){
      html+=`<p>${doc[bookKey]['BookName']}${doc[bookKey]['Bookid']}</p>`
     }
    }
  })
  res.send(html)
})



app.post('/renew',async(req,res)=>{
  const bookid=req.body.bookid;
  const currentDate = new Date();
  const curryear = currentDate.getFullYear();
  const currmonth = currentDate.getMonth() + 1; 
  const currday = currentDate.getDate();
  const doc=await db.findOne({Rollno:req.user._json.family_name})
  const k=doc[bookid]
  const k1={
    BookName:k['BookName'],
    Bookid:k['Bookid'],
    status:'pending for renew',
    Borrowed:`${currday}/${currmonth}/${curryear}`
  }
  const update = {
    $set: {}
};
update.$set[bookid] = k1;
await db.updateOne({Rollno:req.user._json.family_name}, update);
const lib=await db.findOne({Role:'librarian'})
const student={ Name:req['user']['_json']['given_name'],
    Rollno:req['user']['_json']['family_name'],
    Email:req['user']['_json']['email'],
    BookName:k['BookName'],
    Bookid:k['Bookid'],
    status:'pending for renew',
    Borrowed:`${currday}/${currmonth}/${curryear}`}

    const pendingList = lib.pending|| {};
    // Use Object.keys to get an array of keys (book identifiers)
    const bookKeys = Object.keys(pendingList);
    
    // Check if the student is already in the pending list for any book
    const isStudentInPendingList = bookKeys.some(bookKey => {
        const book = pendingList[bookKey];
        return book.Bookid === student.Bookid && book.Rollno === student.Rollno;
    });
if(!isStudentInPendingList){
  if(Object.keys(lib['pending']).length===0){
    //console.log("0 books in pending list with new user")
    const student={ Name:req['user']['_json']['given_name'],
    Rollno:req['user']['_json']['family_name'],
    Email:req['user']['_json']['email'],
    BookName:k['BookName'],
    Bookid:k['Bookid'],
    status:'pending for renew',
    Borrowed:`${currday}/${currmonth}/${curryear}`}

  const update = { $set: { 'pending.Book0': student } }
      await db.updateOne({Role:'librarian'}, update);
  }
  else{

    const len = Object.keys(lib.pending);
      const last = len[len.length - 1];
      const match = last.match(/\d+/);
      const number = parseInt(match[0]) + 1;
      const b = "pending.Book" + number;

      const student={ Name:req['user']['_json']['given_name'],
      Rollno:req['user']['_json']['family_name'],
      Email:req['user']['_json']['email'],
      BookName:k['BookName'],
      Bookid:k['Bookid'],
      status:'pending for renew',
      Borrowed:`${currday}/${currmonth}/${curryear}`}
  
      const update = {
        $set: {}
    };
    update.$set[b] = student;
    
    await db.updateOne({ Role: 'librarian' }, update);
  }
}
else{
  res.send("the book is already requested for renewal")
}
  

})

app.post('/return',async(req,res)=>{
  const bookid=req.body.bookid;
  const doc=await db.findOne({Rollno:req.user._json.family_name})
  doc[bookid]['status']='pending for return';


  const update = {
    $set: {}
};

update.$set[bookid] =doc[bookid] ;

await db.updateOne({Rollno:doc["Rollno"]}, update);

const lib=await db.findOne({Role:'librarian'})
if(Object.keys(lib['pending']).length===0){
  const student={ Name:req['user']['_json']['given_name'],
  Rollno:req['user']['_json']['family_name'],
  Email:req['user']['_json']['email'],
  BookName:doc[bookid]['BookName'],
  Bookid:doc[bookid]['Bookid'],
  status:'pending for return ',
  Borrowed:doc[bookid]['Borrowed']}

const update = { $set: { 'pending.Book0': student } }
    await db.updateOne({Role:'librarian'}, update);
}
else{

  const len = Object.keys(lib.pending);
    const last = len[len.length - 1];
    const match = last.match(/\d+/);
    const number = parseInt(match[0]) + 1;
    const b = "pending.Book" + number;

    const student={ Name:req['user']['_json']['given_name'],
    Rollno:req['user']['_json']['family_name'],
    Email:req['user']['_json']['email'],
    BookName:doc[bookid]['BookName'],
    Bookid:doc[bookid]['Bookid'],
    status:'pending for return',
    Borrowed:doc[bookid]['Borrowed']
  }

    const update = {
      $set: {}
  };
  update.$set[b] = student;
  await db.updateOne({ Role: 'librarian' }, update)
}


})
app.listen(3000,()=>{
console.log("Listening to port 3000!")
})