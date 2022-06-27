import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dayjs from 'dayjs';
import dotenv from 'dotenv';
import joi from 'joi';

dotenv.config();

const client = new MongoClient(process.env.URL_CONNECT_MONGO);
let db;


client.connect().then(() => {
    db = client.db('bate_papo_uol'); // é o banco de dados que criei, que vai conter coleções
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

let now = dayjs();

app.use(cors());
app.use(json());



app.post('/participants', async (req, res) => {

    const validation = nameSchema.validate(req.body); 

    const  { name }  = req.body; 

    const jaCadastrado = await db.collection("participants").findOne({ name: name });

        if( validation.error ) {  
            console.log(validation.error.details);
            res.status(422).send('Preencha seu nome, por favor!');
            return; 
        } else if(jaCadastrado) {
            res.status(409).send('Opa! Este nome já está cadastrado.');
            return;
        };

    try {
        await db.collection("participants").insertOne( { name: name, lastStatus: Date.now()} );
   
        let time = now.format("HH:mm:ss");
    
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
   
        let time = now.format("HH:mm:ss"); 

        names.map(item => {
            db.collection("messages").insertOne( { from: item.name, to: 'Todos', text: 'sai da sala...', type: 'status', time: time });
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

    let time = now.format("HH:mm:ss"); 

    try {
    
        await db.collection("messages").insertOne( { from: User, to: to, text: text, type: type, time: time });
            
        res.status(201).send('Mensagem enviada com sucesso!');
    } catch (error) {
        res.status(500).send(`Erro ao tentar enviar mensagem: ${error}`);
    }

});


app.get('/messages', async (req, res) => {
    const { limit } = req.query; 
    const { User } = req.headers;

    try {
        const arrayMensagens = await db.collection('messages').find({ to: 'Todos', type: 'message' } & { to: User, type: 'private-message' } & { to: 'Todos', type: 'status' }).toArray();

        if(limit) {
            res.send([...arrayMensagens].reverse().slice(-limit));
        } else {
            res.send([...arrayMensagens].reverse());
        }
       
    } catch(error) {
        console.log(error);
        res.status(500).send('Nao foi possivel pegar o array com todas as mensagens');
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