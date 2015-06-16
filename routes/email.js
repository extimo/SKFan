var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    service: 'QQ',
    auth: {
        user: '564494052@qq.com',
        pass: 'sai@564494'
    }
});

var mailOptions = {
    from: '564494052@qq.com ', // sender address
    to: 'sai1989825@163.com', // list of receivers
    subject: 'Hello ', // Subject line
    text: 'Hello world ', // plaintext body
    html: '<b>Here we go !</b>' // html body
};

transporter.sendMail(mailOptions, function(error, info){
    if(error){
        console.log(error);
    }else{
        console.log('Message sent: ' + info.response);
    }
});