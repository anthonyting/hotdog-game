// Copyright 2013 The Gorilla WebSocket Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

type BroadcastMessage struct {
	message []byte
	client *Client
}

// ClientManager maintains the set of active clients and broadcasts messages to the
// clients.
type ClientManager struct {
	// Registered clients.
	clients map[*Client]bool

	// Inbound messages from the clients.
	broadcast chan BroadcastMessage

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client
}

func newClientManager() *ClientManager {
	return &ClientManager{
		broadcast:  make(chan BroadcastMessage),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

func (h *ClientManager) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.bufferedMessages)
			}
		case message := <-h.broadcast:
			for client := range h.clients {
				if (message.client != client) {
					select {
					case client.bufferedMessages <- message.message:
					default:
						close(client.bufferedMessages)
						delete(h.clients, client)
					}
				}
			}
		}
	}
}