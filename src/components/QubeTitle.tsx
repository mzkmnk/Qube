import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import figlet from "figlet";

export const QubeTitle: React.FC = () => {
  const [asciiArt, setAsciiArt] = useState<string>("");

  useEffect(() => {
    // figletで大きなQUBEロゴを生成
    figlet.text(
      "QUBE",
      {
        font: "Standard", // または "Big", "3D-ASCII", "Larry 3D" など
        horizontalLayout: "default",
        verticalLayout: "default",
      },
      (err, data) => {
        if (!err && data) {
          setAsciiArt(data);
        }
      },
    );
  }, []);

  if (!asciiArt) return null;

  return (
    <Box paddingY={1}>
      <Text color="cyan">{asciiArt}</Text>
    </Box>
  );
};