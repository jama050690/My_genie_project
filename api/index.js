import express from "express"
import cors from "cors"
import * as genai from "@google/genai"

console.log( genai )

const PORT = process.env.PORT || 3_000
const app = express()

app.use( cors() )

app.get( "/", ( req, res ) => {

	res.send( { ok: true } )
} )

app.listen( PORT, () => console.log( `Server ready at: ${ PORT }`) )