import {
  AstralObjectRequest,
  Cometh,
  ComethDirection,
  ObjectType,
  Polyanet,
  Position,
  Soloon,
  SoloonsColors,
} from "./types";
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import * as dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Middleware to log every incoming request
const logRequestsMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
};

// Apply middleware to log every request
app.use(logRequestsMiddleware);

// Load environment variables
const API_BASE_URL = process.env.API_BASE_URL;
const CANDIDATE_ID = process.env.CANDIDATE_ID;

// Function to retry an async action
const retry = async <T>(
  action: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> => {
  let attempt = 1;

  while (attempt <= maxAttempts) {
    try {
      return await action();
    } catch (error) {
      console.error(error);
      console.log(`Attempt ${attempt} failed. Retrying...`);

      // Calculate dynamic delay based on attempt number
      const delay = attempt === 1 ? 1000 : 3000;

      console.log(`Waiting for ${delay}ms before retrying...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    attempt++;
  }

  throw new Error(`Max retries reached. Failed after ${maxAttempts} attempts.`);
};

// Function to fetch an astral object
const fetchAstralObject = async (
  objectType: ObjectType,
  url: string,
  request: AstralObjectRequest,
  res: express.Response
): Promise<void> => {
  try {
    await retry(async () => {
      const response = await fetch(url, request);

      if (response.ok) {
        if (!res.headersSent) {
          res
            .status(200)
            .json({ message: `${objectType} operation successful.` });
        }
      } else {
        if (!res.headersSent) {
          res.status(response.status).json({ error: response.statusText });
        }
        throw new Error(`Request failed with status ${response.status}`);
      }
    });
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

// Function to create an astral object
const createAstralObject = async (
  objectType: ObjectType,
  position: Position,
  res: express.Response,
  color?: SoloonsColors,
  direction?: ComethDirection
): Promise<void> => {
  const url = `${API_BASE_URL}/${objectType}`;
  let body: string;

  console.log("Object type in createAstralObject: ", objectType);

  switch (objectType) {
    case "polyanets":
      body = JSON.stringify({
        ...position,
        candidateId: CANDIDATE_ID,
      } as Polyanet);
      break;
    case "soloons":
      if (!color) {
        throw res.status(400).json({ error: "Color is required for Soloon." });
      }
      body = JSON.stringify({
        ...position,
        candidateId: CANDIDATE_ID,
        color,
      } as Soloon);
      break;
    case "comeths":
      if (!direction) {
        throw res
          .status(400)
          .json({ error: "Direction is required for Cometh." });
      }
      body = JSON.stringify({
        ...position,
        candidateId: CANDIDATE_ID,
        direction,
      } as Cometh);
      break;
    default:
      throw res.status(400).json({ error: "Invalid astral object type." });
  }

  const request: AstralObjectRequest = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  };

  await fetchAstralObject(objectType, url, request, res);
};

// Function to delete an astral object
const deleteAstralObject = async (
  objectType: ObjectType,
  position: Position,
  res: express.Response
): Promise<void> => {
  const url = `${API_BASE_URL}/${objectType}`;
  let body: string;

  switch (objectType) {
    case "polyanets":
      body = JSON.stringify({
        ...position,
        candidateId: CANDIDATE_ID,
      } as Polyanet);
      break;
    case "soloons":
      body = JSON.stringify({
        ...position,
        candidateId: CANDIDATE_ID,
      } as Soloon);
      break;
    case "comeths":
      body = JSON.stringify({
        ...position,
        candidateId: CANDIDATE_ID,
      } as Cometh);
      break;
    default:
      throw res.status(400).json({ error: "Invalid astral object type." });
  }

  const request: AstralObjectRequest = {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body,
  };

  await fetchAstralObject(objectType, url, request, res);
};

// Function to reset the map
const resetMap = async (
  res: express.Response,
  delayBetweenRequests: number = 1000
): Promise<void> => {
  const url = `${API_BASE_URL}/polyanets`;

  try {
    // 11x11 spaces map
    const rows = 11;
    const columns = 11;

    // Iterate over all spaces and add delete requests to the batch
    for (let row = 0; row <= rows - 1; row++) {
      for (let column = 0; column <= columns - 1; column++) {
        const body = JSON.stringify({
          row: String(row),
          column: String(column),
          candidateId: CANDIDATE_ID,
        } as Polyanet);

        const request: AstralObjectRequest = {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body,
        };

        console.log(`Sending request to ${url} with body:`, body);

        try {
          const response = await fetch(url, request);

          if (!response.ok) {
            console.error(`Request failed with status ${response.status}`);
            res
              .status(response.status || 500)
              .json({ error: response.statusText || "Internal Server Error" });
            return;
          }

          console.log(`Request to ${url} successful.`);

          // Introduce a delay between requests only if the current request is successful
          if (delayBetweenRequests > 0 && row < rows - 1) {
            await new Promise(resolve =>
              setTimeout(resolve, delayBetweenRequests)
            );
          }
        } catch (error) {
          console.error(`Error sending request: ${error.message}`);
          res.status(500).json({ error: "Internal Server Error" });
          return;
        }
      }
    }

    res.status(200).json({ message: "Map reset successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Function to perform bulk operations
const performBulkOperation = async (
  bulkData: string[][],
  res: express.Response,
  delayBetweenRequests: number = 1000
): Promise<void> => {
  const operations: Array<{
    type: string;
    position: Position;
    color?: SoloonsColors;
    direction?: ComethDirection;
  }> = [];
  console.log(bulkData);

  try {
    // Convert bulk data to individual operations
    bulkData.forEach((rowData, row) => {
      rowData.forEach((type, column) => {
        operations.push({
          type,
          position: { row: String(row), column: String(column) },
        });
      });
    });

    // Perform bulk operation
    for (const operation of operations) {
      try {
        const { type, position } = operation;
        console.log("Type: ", type);
        // Extract the object type from the type
        const objectType =
          type.indexOf("_") > 0
            ? type.split("_")[1].toLowerCase() + "s"
            : type.toLowerCase() + "s";

        console.log(
          `Performing bulk operation: ${objectType} at ${position.row},${position.column}`
        );
        console.log("objectType: ", objectType);

        // Extract color from the type if its a Soloon
        let color = "blue" as SoloonsColors;
        if (objectType === "soloons") {
          color = type.split("_")[0].toLowerCase() as SoloonsColors;
        }

        // Extract direction from the type if its a Cometh
        let direction = "up" as ComethDirection;
        if (objectType === "comeths") {
          direction = type.split("_")[0].toLowerCase() as ComethDirection;
        }

        switch (objectType) {
          case "spaces":
            // No need to send a request for a space
            break;
          case "polyanets":
          case "soloons":

          case "comeths":
            // Pass the objectType, color, and direction to the createAstralObject function
            await createAstralObject(
              objectType,
              position,
              res,
              color,
              direction
            );
            break;
          default:
            throw new Error("Invalid astral object type.");
        }

        // Introduce a delay between requests only if the current request is successful
        if (
          delayBetweenRequests > 0 &&
          operation !== operations[operations.length - 1]
        ) {
          await new Promise(resolve =>
            setTimeout(resolve, delayBetweenRequests)
          );
        }
      } catch (error) {
        console.error(`Error performing bulk operation: ${error.message}`);
        throw new Error("Internal Server Error");
      }
    }

    res.status(200).json({ message: "Bulk operation completed successfully." });
  } catch (error) {
    console.error(`Error performing bulk operation: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
};

// Endpoint to perform bulk operations
app.post("/api/bulkoperation", (req, res) => {
  console.log(req.body);
  const bulkData = req.body;
  console.log(bulkData);

  if (!bulkData || !Array.isArray(bulkData)) {
    return res.status(400).json({ error: "Invalid bulk data array." });
  }

  performBulkOperation(bulkData, res);
});

// Endpoint to reset the map
app.delete("/api/reset-map", (req, res) => {
  resetMap(res);
});

// Endpoint to create an astral object
app.post("/api/:objectType", (req, res) => {
  const { row, column, color, direction } = req.body;
  console.log(req.body);
  // get the objectType from the last part of the path
  const objectType = req.params.objectType;
  console.log(objectType);

  try {
    createAstralObject(
      objectType as ObjectType,
      { row, column },
      res,
      color,
      direction
    );
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Endpoint to delete an astral object
app.delete("/api/:objectType", (req, res) => {
  const { objectType } = req.params;
  const { row, column } = req.body;
  deleteAstralObject(objectType as ObjectType, { row, column }, res);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
