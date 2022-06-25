import express, { json } from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import dayjs from 'dayjs';
import dotenv from 'dotenv';

dotenv.config();

const client = MongoClient(process.env.URL_CONNECT_MONGO);
let db;

client.connect().then(() => {
    db = client.db('bate_papo_uol'); //bate_papo_uol é o banco de dados que criei, que vai conter coleções
}).catch((error) => {
    console.log(`Erro ao conectar o banco de dados: ${error}`);
});

const app = express();

const dayjs = require('dayjs');

app.use(cors());
app.use(json());


app.post('/participants', async (req, res) => {
    const { name } = req.body; 
    const jaCadastrado = await db.colllection("participants").findOne({ name: name });

        if( !name ) {  //validar nome com lib joi
            res.status(422).send('Preencha seu nome, por favor!');
            return; //'return forçado' para nao executar o resto do codigo!
        } else if(jaCadastrado) {
            //se o nome ja estivar cadastrado no mongo, retornar status erro 409! > AULA SEG 20/06 1H39MIN - 1H55MIN
            res.status(409).send('Opa! Este nome já está cadastrado.');
            return;
        };

    await db.collection("participants").insertOne( { name: name, lastStatus: Date.now()} );
   
    let time = dayjs.format("HH:mm:ss"); // ou new Date().getTime() ??

    await db.collection("messages").insertOne( { from: name, to: 'Todos', text: 'entra na sala...', type: 'status', time: time });
        
    res.status(201).send('Usuario entrou na sala com sucesso!');
       // caso de sucesso salvar a msg de entrada
    });//salvar participante no mongodb (formado especificado)


app.get('/participants', (req, res) => {
    try {
        const arrayParticipantes = await db.collection('participants').find().toArray();
        res.send(arrayParticipantes);
    } catch(error) {
        console.log(error);
        res.status(500).send('Nao foi possivel pegar o array com todos os participantes');
    }
  
   }); //retonna a lista de todos os participantes

setInterval(
function deletarAutomatico () {
    app.delete('/participants', async (req, res) => {
        
    try {
        // const names = db.collection("participants").findMany([{ lastStatus: 11000 }]).name ?? > array de nomes
        // como pegar o(s) nome(s) de dento do documento com uma condicao?
        // testar no mongo.
        await db.collection("participants").deleteMany( [{ lastStatus: 11000 }] );
   
        let time = dayjs.format("HH:mm:ss"); // ou new Date().getTime() ??
        // faz um map em names executanto o codigo abaixo para cada 'name'do array:
        await db.collection("messages").insertOne( { from: name, to: 'Todos', text: 'sai da sala...', type: 'status', time: time });
            
        res.status(201).send('Usuario saiu da sala com sucesso!');
    }  catch (error) {
        res.status(500).send('Nao foi possivel deletar o usuario.')
    }
       
});}, 15000);


app.post('/messages', (req, res) => {
    const { to, text, type } = req.body;
    console.log(req.headers); //pra ver como pegar o 'from' logo abaixo (é user ou outro nome?)
    //const { from: user } = req.headers; >> O FRONT QUE MANDA HEADERS!
    //validação com lib joi
    //salvar no mongo com atributo 'time'-> da lib dayjs
    //retornar status
});


app.get('/messages', (req, res) => {
    const { limit } = req.query; //aceita parametro opcional querystring para limitar o numero de mensagens que recebe > QUERY NAO PRECISA DECLARAR NO BACK! USA const {page} = req.query, opr ex, para pegar o param query
    //ex. '/messages?limit=100' para retornar as 100 ultimas
    //caso não haja limite fornecido, todas as msgs devem ser retornadas
    //as msgs que privadas do usuario tambem devem ser retornadas, para isso, o front envia um header User
});


// app.post('/status', (req, res) => {     "Deve receber por um header na requisição, chamado User, contendo o nome do participante
//     const { User } = req.header;
        //checar se o participante está na lista de participantes -> se false, retornar erro status 404
        //atualizar o atrubuto lastStatus do participante com o timestamp atual -> Date.now()
        //retornar status 200
// });



app.listen(5000);