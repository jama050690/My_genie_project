import './style.css'
import { markdown } from "markdown"

const textarea = document.getElementById( "textarea" )
const messages = document.getElementById( "messages" )
const sendBtn = document.getElementById( "send-btn" )
const themeToggle = document.getElementById( "theme-toggle" )
const themeIcon = document.querySelector( ".theme-icon" )

function handleSend() {
	const text = textarea.value.trim()
	if ( text ) {
		createMessageItem( text, { type: "user" } )
		sendPrompt( text )
		textarea.value = ""
		textarea.focus()
	}
}

textarea.onkeyup = event => {
	if ( event.code === "Enter" && !event.shiftKey ) {
		event.preventDefault()
		handleSend()
	}
}

sendBtn.onclick = () => {
	handleSend()
}

window.addEventListener( "keyup", event => {
	if ( textarea.value.length === 0 && event.code.startsWith( "Key" ) ) {
		textarea.value += event.key
		textarea.focus()
	}
} )

// Theme functionality
function initTheme() {
	const savedTheme = localStorage.getItem( "theme" ) || "light"
	document.documentElement.setAttribute( "data-theme", savedTheme )
	updateThemeIcon( savedTheme )
}

function toggleTheme() {
	const currentTheme = document.documentElement.getAttribute( "data-theme" )
	const newTheme = currentTheme === "dark" ? "light" : "dark"

	document.documentElement.setAttribute( "data-theme", newTheme )
	localStorage.setItem( "theme", newTheme )
	updateThemeIcon( newTheme )
}

function updateThemeIcon( theme ) {
	themeIcon.textContent = theme === "dark" ? "☀️" : "🌙"
}

themeToggle.onclick = toggleTheme

// Initialize theme on page load
initTheme()

async function sendPrompt( promptText ) {

	const response = await fetch( "http://localhost:3000/prompt", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify( { prompt: promptText } )
	} )

	const json = await response.json()

	createMessageItem( json.answer, { type: "bot" } )
}

function createMessageItem( message, options ) {
	const li = document.createElement( "li" )
	li.className = `message message-${options.type}`

	const content = document.createElement( "div" )
	content.className = "message-content"
	content.innerHTML = markdown.toHTML( message )

	const label = document.createElement( "div" )
	label.className = "message-label"
	label.textContent = options.type === "user" ? "Siz" : "Bot"

	li.appendChild( label )
	li.appendChild( content )
	messages.appendChild( li )

	// Scroll to bottom
	li.scrollIntoView({ behavior: "smooth" })
}