import createTicketChannel from "./event/createTicketChannel";
import closeTicketChannel from "./event/closeTicketChannel";
import createTicketThread from "./event/createTicketThread";
import closeTicketThread from "./event/closeTicketThread";

export const events = { createTicketChannel, closeTicketChannel, closeTicketThread, createTicketThread };