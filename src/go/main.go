package main

import (
	"fmt"
	"log"
	"net/http"
)

func HomeHandler(w http.ResponseWriter, r *http.Request) {
	// needed for some worker stuff, but it breaks mobile devices without a cert
	// w.Header().Set("Cross-Origin-Opener-Policy", "same-origin")
	// w.Header().Set("Cross-Origin-Embedder-Policy", "require-corp")
	http.FileServer(http.Dir("./static")).ServeHTTP(w, r)
}

func main() {
	hub := newClientManager()
	go hub.run()
	http.Handle("/", http.HandlerFunc(HomeHandler))

	// socket implementation was modified from https://github.com/gorilla/websocket/tree/master/examples/chat
	// - removed new line/parsing of messages
	// - renamed variables to make more sense to me
	// - prevent sending messages to self on broadcast
	http.HandleFunc("/socket", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	fmt.Println("Starting server on port 3000")
	log.Fatal(http.ListenAndServe(":3000", nil))
}
