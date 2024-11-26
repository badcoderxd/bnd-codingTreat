const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const port = 4200;

// Middleware to parse JSON request bodies
app.use(bodyParser.json());
app.use(cors({
origin:["https://sweet-jade.vercel.app", "*"]
}))

// Function to execute Python code in Docker
const executePythonCode = async (code) => {
    return new Promise((resolve, reject) => {
        const tempFile = path.join(__dirname, 'temp.py');
        fs.writeFileSync(tempFile, code);

        exec(`docker run --rm -v ${path.dirname(tempFile)}:/app python-compiler  python /app/temp.py`, (err, stdout, stderr) => {
            fs.unlinkSync(tempFile);  // Clean up temp file
            if (err) {
                reject(stderr);
            } else {
                resolve(stdout);
            }
        });
    });
};

const executeJavaCode = async (code) => {
  return new Promise((resolve, reject) => {
      // Define temporary file paths
      const tempFile = path.join(__dirname, 'Temp.java');
      const tempClassFile = path.join(__dirname, 'Temp.class');

      // Write Java code to a temporary file
      fs.writeFileSync(tempFile, code);

      // Run Docker command to compile and execute the Java code inside the container
      exec(`docker run --rm -v ${path.dirname(tempFile)}:/app java-compiler bash -c "javac /app/Temp.java && java -cp /app Temp"`, (err, stdout, stderr) => {
          // Clean up temporary Java files
          fs.unlinkSync(tempFile);  // Remove source file
          if (fs.existsSync(tempClassFile)) {
              fs.unlinkSync(tempClassFile);  // Remove compiled class file
          }

          if (err) {
              reject(stderr);  // Reject with error message
          } else {
              resolve(stdout);  // Resolve with the output of the Java program
          }
      });
  });
};

// Function to execute Node.js code in Docker
const executeNodeCode = async (code) => {
    return new Promise((resolve, reject) => {
        const tempFile = path.join(__dirname, 'temp.js');
        fs.writeFileSync(tempFile, code);

        exec(`docker run --rm -v ${path.dirname(tempFile)}:/app node:18 node /app/temp.js`, (err, stdout, stderr) => {
            fs.unlinkSync(tempFile);  // Clean up temp file
            if (err) {
                reject(stderr);
            } else {
                resolve(stdout);
            }
        });
    });
};

// Single API endpoint for executing code in different languages
app.post('/api/execute', async (req, res) => {
    const { language, code } = req.body;

    // Validate input
    if (!language || !code) {
        return res.status(400).json({ error: 'Both language and code are required' });
    }

    try {
        let output;
        if (language === 'python') {
            output = await executePythonCode(code);
        } else if (language === 'node') {
            output = await executeNodeCode(code);
        } 
        else if(language === 'java'){
            output = await executeJavaCode(code);
       } 
      else {
            return res.status(400).json({ error: 'Unsupported language. Use "python" or "node"' });
        }

        res.json({ output });
    } catch (error) {
        res.status(500).json({ error: error.toString() });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
