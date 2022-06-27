import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dayjs from 'dayjs';
import dotenv from 'dotenv';
import joi from 'joi';

dotenv.config();

const client = MongoClient(process.env.URL_CONNECT_MONGO);
let db;


client.connect().then(() => {
    db = client.db('bate_papo_uol'); //bate_papo_uol é o banco de dados que criei, que vai conter coleções
}).catch((error) => {
    console.log(`Erro ao conectar o banco de dados: ${error}`);
});


const nameSchema = joi.object({
    name: joi.string().required()
});

const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required() //"private_message" ou "message". É isso mesmo?
});


const app = express();

//const dayjs = require('dayjs');

app.use(cors());
app.use(json());



app.post('/participants', async (req, res) => {
    const { name } = req.body; 

    const validation = nameSchema.validate(name); 

    const jaCadastrado = await db.colllection("participants").findOne({ name: name });

        if( validation.error ) {  
            console.log(validation.error.details);
            res.status(422).send('Preencha seu nome, por favor!');
            return; 
        } else if(jaCadastrado) {
            //se o nome ja estivar cadastrado no mongo, retornar status erro 409! > AULA SEG 20/06 1H39MIN - 1H55MIN
            res.status(409).send('Opa! Este nome já está cadastrado.');
            return;
        };

    try {
        await db.collection("participants").insertOne( { name: name, lastStatus: Date.now()} );
   
        let time = dayjs.format("HH:mm:ss"); // ou new Date().getTime() ??
    
        await db.collection("messages").insertOne( { from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: time });
            
        res.status(201).send('Usuario entrou na sala com sucesso!');
    } catch (error) {
        res.status(500).send(`Erro ao tentar inserir participante: ${error}`);
    }

});


app.get('/participants', async (req, res) => {
    try {
        const arrayParticipantes = await db.collection('participants').find().toArray();
        res.send(arrayParticipantes);
    } catch(error) {
        console.log(error);
        res.status(500).send('Nao foi possivel pegar o array com todos os participantes');
    }
  
}); 

//setInterval(
async function deletarAutomatico () {
        
    try {
        const names = await db.collection("participants").findMany({ lastStatus: 11000 }).toArray() // array de nomes
        await db.collection("participants").deleteMany( { lastStatus: 11000 } ); 
   
        let time = dayjs.format("HH:mm:ss"); // ou new Date().getTime() ??

        names.map(item => {
            await db.collection("messages").insertOne( { from: item.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: time });
        });
        
        res.status(201).send('Usuario(s) saiu da sala com sucesso!');
    }  catch (error) {
        res.status(500).send(`Nao foi possivel deletar o usuario. ERRO: ${error}`)
    }
       
} //, 15000);


app.post('/messages', async (req, res) => {
    
    const validation = messageSchema.validate(req.body);

    if(validation.error) {
        console.log(validation.error.details);
        res.status(422).send('Preencha os dados corretamente, por favor!');
        return;
    }

    const { to, text, type } = req.body;
    const { User } = req.headers;

    let time = dayjs.format("HH:mm:ss"); // ou new Date().getTime() ??

    try {
    
        await db.collection("messages").insertOne( { from: User, to: to, text: text, type: type, time: time });
            
        res.status(201).send('Mensagem enviada com sucesso!');
    } catch (error) {
        res.status(500).send(`Erro ao tentar enviar mensagem: ${error}`);
    }

});


app.get('/messages', (req, res) => {
    const { limit } = req.query; //aceita parametro opcional querystring para limitar o numero de mensagens que recebe > QUERY NAO PRECISA DECLARAR NO BACK! USA const {page} = req.query, opr ex, para pegar o param query
    const { User } = req.headers;

    try {
        const arrayMensagenTodos = await db.collection('messages').find({ to: 'Todos', type: 'message' }).toArray();
        const arrayMensagensPrivadas = await db.collection('messages').find({ to: User, type: 'private-message' }).toArray();

        const arrayMensagens = arrayMensagenTodos.concat(arrayMensagensPrivadas);
        res.send(arrayMensagens);
    } catch(error) {
        console.log(error);
        res.status(500).send('Nao foi possivel pegar o array com todos os participantes');
    }
  
});


app.post('/status', async (req, res) => {     //"Deve receber por um header na requisição, chamado User, contendo o nome do participante
     const { User } = req.headers;
    
     try{
        const estaOn = await db.collection('participants').findOne({ name: User });
        if(estaOn) {
            await db.collection('participants').updateOne({ name: estaOn.name }, { $set: {lastStatus: Date.now()} });
            res.status(200).send('Usuario esta on!');
        }
           //checar se o participante está na lista de participantes 
           //se esta, atualizar o atrubuto lastStatus do participante com o timestamp atual -> Date.now()
           //retornar status 200
           res.status(404).send('Usuario esta off!'); // se nao encontrou nao eh erro! entao cai aqui.
     } catch(error) {
        res.status(404).send(`${error}`);
     }
       
 });



app.listen(5000);