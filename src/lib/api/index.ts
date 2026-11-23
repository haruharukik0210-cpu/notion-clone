import axios from "axios";
import { addAuthorizationHeader } from "./ interceptors/request";
import { errorHandler } from "./ interceptors/response";

const baseURL = import.meta.env.VITE_API_URL;
const api = axios.create({ baseURL });
api.defaults.headers.common["Content-Type"] = "application/json";
api.interceptors.request.use(addAuthorizationHeader);
api.interceptors.response.use((response) => response, errorHandler);

export default api;
