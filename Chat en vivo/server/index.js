import express from "express"
import logger from "morgan" 
import {Server} from "socket.io"
import {createServer} from "node:http" //? importamos la posibilidad de crear el servidor de node http
import dotenv from "dotenv"
dotenv.config()
import {createClient} from "@libsql/client"

const port = process.env.PORT ?? 8080 // ? ponemos el puerto como variables de entorno pero el predeterminado será el 8080

const app = express();
const server = createServer(app) //? creamos servidor http
const io = new Server(server, {
    connectionStateRecovery: {} //? aquí se almacenan los mensajes que se envían cuando no hay conexión, para que no se pierdan y se envíen automáticamente al restablecer conexion
})

const db = createClient({ //? ----- estamos creando la base de datos con turo
    url: "libsql://included-shadow-marionovaro.turso.io", //? es la url que nos ha dado turo al crear la db
    authToken: process.env.DB_TOKEN //? el token también se lo hemos pedido a turo con 
})

await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        content TEXT
    )
`)
//? id INTEGER PRIMARY KEY AUTOINCREMENT --> es un entero, el la llave principal por lo que no se puede modificar y es unica, y cada vez que se haga enviar se cambia por el autoincrement

io.on("connection", (socket) => { //? cada vez que se conecta alguien ejecuto el callback
    console.log("a user has connected!")

    socket.on("disconnect", () => { //? cada vez que se desconecta alguien ejecuto el callback
        console.log("a user has disconnected!")
    })

    socket.on("chat message", async (msg) => { //? cuando reciba un mensaje (lo hemos enviado en el index con el eventListener):
        console.log("message: " + msg) //? nos muestra el mensaje (msg) en la consola
        let result
        try {
            result = await db.execute({
                sql: `INSERT INTO messages (content) VALUES (:message)`, //? le metemos dentro del contenido de los mensajes el mensaje que se ha enviado
                args: {message: msg} //? aquí estipulamos que el valor que meteremos es el mensaje que se ha enviado
            })
        } catch (error) {
            console.log(error)
            return
        }
        io.emit("chat message", msg, result.lastInsertRowid.toString()) //? aquí estamos emitiendo el mensaje a todo el mundo (BROADCAST) (Ver captura de pantalla: Socket emit - io emit) y también enviamos el id del mensaje que se ha enviado (creado en el id INTEGER PRIMARY KEY AUTOINCREMENT)
    })
})

app.use(logger("dev")) //? nos da información sobre lo que se ha pedido y se ha enviado en la url

app.get("/", (req, res) => { //? cuando pongamos nuestro url sin nada en los params, nos devuelve:
    res.sendFile(process.cwd() +  "/client/index.html") //? le estamos diciendo qué archivo abrir: el cwd (current working directory) que es donde se ha inicializado el proceso (hacemos el npm run dev) (chat en vivo) + la dirección del archivo que queremos abrir desde ahi ==> es como si puesieramos C:\Users\icust\OneDrive\Documentos\OneDrive\Documentos\Bootcamp Developer\NEOLAND\Proyectos BackEnd\Chat en vivo/client/index.html
})
server.listen(port, () => {
    console.log(`Server running on port ${port}`) //? no sale en la consola que estamos conectados en el servidor que tengamos puesto
})