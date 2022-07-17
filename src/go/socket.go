// Copyright 2013 The Gorilla WebSocket Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 10000
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	clientManager *ClientManager

	// The websocket connection.
	connection *websocket.Conn

	// Buffered channel of outbound messages.
	bufferedMessages chan []byte
}

func (client *Client) readSocket() {
	defer func() {
		//cleanup
		client.clientManager.unregister <- client
		client.connection.Close()
	}()
	client.connection.SetReadLimit(maxMessageSize)
	client.connection.SetReadDeadline(time.Now().Add(pongWait))
	client.connection.SetPongHandler(func(string) error { 
		client.connection.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := client.connection.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		client.clientManager.broadcast <- BroadcastMessage{message: message, client: client}
	}
}

func (client *Client) writeSocket() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		// cleanup after
		ticker.Stop()
		client.connection.Close()
	}()
	for {
		select {
		case message, ok := <-client.bufferedMessages:
			client.connection.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The client manager closed the channel.
				client.connection.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := client.connection.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message.
			n := len(client.bufferedMessages)
			for i := 0; i < n; i++ {
				w.Write(<-client.bufferedMessages)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			client.connection.SetWriteDeadline(time.Now().Add(writeWait))
			if err := client.connection.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// serveWs handles websocket requests from the peer.
func serveWs(clientManager *ClientManager, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := &Client{clientManager: clientManager, connection: conn, bufferedMessages: make(chan []byte, 256)}
	client.clientManager.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writeSocket()
	go client.readSocket()
}