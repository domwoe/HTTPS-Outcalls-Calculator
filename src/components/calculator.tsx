"use client";

import { useState, useCallback, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { useMediaQuery } from "@/hooks/use-media-query";

export default function CostCalculator() {
  const [requestSize, setRequestSize] = useState(0);
  const [responseSize, setResponseSize] = useState(0);
  const [nodes, setNodes] = useState(13);
  const [url, setUrl] = useState(
    "https://api.coinbase.com/api/v3/brokerage/market/products/BTC-USD/candles?start=1726308138&end=1726318138&granularity=ONE_HOUR"
  );
  const [headers, setHeaders] = useState("");
  const [payload, setPayload] = useState("");
  const [simulatedRequestSize, setSimulatedRequestSize] = useState(0);
  const [simulatedResponseSize, setSimulatedResponseSize] = useState(0);
  const [requestType, setRequestType] = useState("get");
  const [response, setResponse] = useState<string>("");
  const [xdrToUsdRate, setXdrToUsdRate] = useState(1);
  const [ipv6Support, setIpv6Support] = useState<boolean | null>(null);

  // https://github.com/dfinity/ic/blob/d4ee25b0865e89d3eaac13a60f0016d5e3296b31/rs/config/src/subnet_config.rs#L484
  const HTTP_REQUEST_LINEAR_BASELINE_FEE = 3_000_000;
  const HTTP_REQUEST_QUADRATIC_BASELINE_FEE = 60_000;
  const HTTP_REQUEST_PER_BYTE_FEE = 400;
  const HTTP_RESPONSE_PER_BYTE_FEE = 800;

  const MAX_RESPONSE_BYTES = 2_000_000;

  useEffect(() => {
    fetch("https://api.exchangerate-api.com/v4/latest/XDR")
      .then((response) => response.json())
      .then((data) => setXdrToUsdRate(data.rates.USD))
      .catch((error) =>
        console.error("Error fetching XDR to USD rate:", error)
      );
  }, []);

  // https://github.com/dfinity/ic/blob/d4ee25b0865e89d3eaac13a60f0016d5e3296b31/rs/cycles_account_manager/src/lib.rs#L1107
  const calculateCost = (req: number, res: number, nodeCount: number) => {
    const costInXDR =
      ((HTTP_REQUEST_LINEAR_BASELINE_FEE +
        HTTP_REQUEST_QUADRATIC_BASELINE_FEE * nodeCount +
        req * HTTP_REQUEST_PER_BYTE_FEE +
        res * HTTP_RESPONSE_PER_BYTE_FEE) *
        nodeCount) /
      1_000_000_000_000;
    return costInXDR;
  };

  const calculateRequestSize = () => {
    const encoder = new TextEncoder();

    const urlSize = encoder.encode(url).length;
    const headerSize = headers.split("\n").reduce((acc, header) => {
      return acc + encoder.encode(header).length;
    }, 0);
    const bodySize = encoder.encode(payload).length;

    return urlSize + headerSize + bodySize;
  };

  const calculateResponseSize = (response: Response, body: string) => {
    const encoder = new TextEncoder();
    const headerSize = Array.from(response.headers.entries()).reduce(
      (acc, [key, value]) => {
        return acc + encoder.encode(key).length + encoder.encode(value).length;
      },
      0
    );
    const bodySize = encoder.encode(body).length;

    return headerSize + bodySize;
  };

  const checkIPv6Support = async (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      const dnsUrl = `https://dns.google/resolve?name=${hostname}&type=AAAA`;
      const response = await fetch(dnsUrl);
      const data = await response.json();

      setIpv6Support(
        data &&
          data.Answer &&
          data.Answer.some((answer: { type: number }) => answer.type === 28)
      );
    } catch (error) {
      console.error("Error checking IPv6 support:", error);
      setIpv6Support(null);
    }
  };

  const simulateRequest = useCallback(async () => {
    calculateRequestSize();

    await checkIPv6Support(url);
    try {
      const headerEntries = headers
        .split("\n")
        .filter((h) => h.includes(":"))
        .map((h) => h.split(":").map((s) => s.trim()));

      const options: RequestInit = {
        method: requestType.toUpperCase(),
        headers: Object.fromEntries(headerEntries),
      };

      if (requestType.toLowerCase() === "post") {
        options.body = payload;
      }

      const proxyUrl =
        "https://outcalls-proxy.dom-woe.workers.dev/?url=" +
        encodeURIComponent(url);
      const response = await fetch(proxyUrl, options);
      const responseText = await response.text(); // Get the raw response text
      const fullResponse = {
        status: `${response.status} ${response.statusText}`,
        headers: Object.fromEntries(response.headers),
        body: responseText, // Use the raw response text
      };
      setSimulatedRequestSize(calculateRequestSize());
      setSimulatedResponseSize(calculateResponseSize(response, responseText));

      setResponse(JSON.stringify(fullResponse, null, 2));
    } catch (error) {
      console.error("Error making request:", error);
      setSimulatedRequestSize(calculateRequestSize());
      setSimulatedResponseSize(0);
      setResponse(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }, [url, headers, requestType, payload]);

  const isSmallViewport = useMediaQuery("(max-width: 640px)");

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>HTTPS Outcalls Cost Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="simulation" className="space-y-4">
          <TabsList>
            <TabsTrigger
              value="simulation"
              className={isSmallViewport ? "text-sm px-2 py-1" : ""}
            >
              {isSmallViewport ? "Simulate" : "Request Simulation"}
            </TabsTrigger>
            <TabsTrigger
              value="slider"
              className={isSmallViewport ? "text-sm px-2 py-1" : ""}
            >
              {isSmallViewport ? "Calculate" : "Slider Calculator"}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="slider" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="requestSize">
                Request Size: {requestSize} bytes
              </Label>
              <Slider
                id="requestSize"
                min={0}
                max={2000000}
                step={1}
                value={[requestSize]}
                onValueChange={(value) => setRequestSize(value[0])}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responseSize">
                Response Size: {responseSize} bytes
              </Label>
              <Slider
                id="responseSize"
                min={0}
                max={2000000}
                step={1}
                value={[responseSize]}
                onValueChange={(value) => setResponseSize(value[0])}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nodes">Number of Nodes</Label>
              <Select
                value={nodes.toString()}
                onValueChange={(value) => setNodes(parseInt(value))}
              >
                <SelectTrigger id="nodes">
                  <SelectValue placeholder="Select number of nodes in subnet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="13">13 nodes</SelectItem>
                  <SelectItem value="28">28 nodes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-4">
              <p>
                Estimated Cost: TCycles{" "}
                {calculateCost(
                  requestSize,
                  responseSize,
                  nodes
                ).toFixed(6)}
              </p>
              <h3 className="text-2xl font-bold">
                Estimated Cost: $
                {(calculateCost(requestSize, responseSize, nodes) * xdrToUsdRate).toFixed(6)}
              </h3>
            </div>
          </TabsContent>
          <TabsContent value="simulation" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/api"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requestType">Request Type</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger id="requestType">
                  <SelectValue placeholder="Select Request Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="get">GET</SelectItem>
                  <SelectItem value="post">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {requestType.toLowerCase() === "post" && (
              <div>
                <div className="space-y-2">
                  <Label htmlFor="headers">Headers (one per line)</Label>
                  <Textarea
                    id="headers"
                    value={headers}
                    onChange={(e) => setHeaders(e.target.value)}
                    placeholder="Content-Type: application/json"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payload">Payload</Label>
                  <Textarea
                    id="payload"
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                    placeholder="Enter payload here"
                    rows={4}
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="simulationNodes">Number of Nodes</Label>
              <Select
                value={nodes.toString()}
                onValueChange={(value) => setNodes(Number(value))}
              >
                <SelectTrigger id="simulationNodes">
                  <SelectValue placeholder="Select number of nodes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="13">13 nodes</SelectItem>
                  <SelectItem value="28">28 nodes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={simulateRequest}>Simulate Request</Button>
            <div className="space-y-2">
              <p>
                Request Size: {simulatedRequestSize} bytes{" "}
                <span className="text-xs text-gray-500">
                  (excluding transform function)
                </span>
              </p>
              <p>Response Size: {simulatedResponseSize} bytes</p>
              <p className="flex items-center">
                IPv6 Support:{"\u00A0"}
                <span
                  className={
                    ipv6Support === false ? "text-red-500 font-semibold" : ""
                  }
                >
                  {ipv6Support === null
                    ? "Unknown"
                    : ipv6Support
                    ? "Yes"
                    : "No"}
                </span>
              </p>
              <p>
                Estimated Cost: TCycles{" "}
                {calculateCost(
                  simulatedRequestSize,
                  simulatedResponseSize,
                  nodes
                ).toFixed(6)}
              </p>
              <h3 className="text-2xl font-bold">
                Estimated Cost: $
                {(
                  calculateCost(
                    simulatedRequestSize,
                    simulatedResponseSize,
                    nodes
                  ) * xdrToUsdRate
                ).toFixed(6)}
              </h3>
              <span className="text-sm text-gray-200">
                {" "}
                with max response size $
                {(
                  calculateCost(
                    simulatedRequestSize,
                    MAX_RESPONSE_BYTES,
                    nodes
                  ) * xdrToUsdRate
                ).toFixed(6)}{" "}
                (Faktor{" "}
                {(
                  (calculateCost(
                    simulatedRequestSize,
                    MAX_RESPONSE_BYTES,
                    nodes
                  ) *
                    xdrToUsdRate) /
                  (calculateCost(
                    simulatedRequestSize,
                    simulatedResponseSize,
                    nodes
                  ) *
                    xdrToUsdRate)
                ).toFixed(0)}
                x)
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="response">Response</Label>
              <ScrollArea.Root className="h-[200px] w-full rounded-md border">
                <ScrollArea.Viewport className="h-full w-full p-4">
                  {response && (
                    <div className="mb-4">
                      <pre className="text-sm whitespace-pre-wrap">
                        {(() => {
                          try {
                            const parsedResponse = JSON.parse(response);
                            return JSON.stringify(parsedResponse, null, 2);
                          } catch {
                            return response; // If it's not valid JSON, return as is
                          }
                        })()}
                      </pre>
                    </div>
                  )}
                </ScrollArea.Viewport>
                <ScrollArea.Scrollbar orientation="vertical">
                  <ScrollArea.Thumb />
                </ScrollArea.Scrollbar>
              </ScrollArea.Root>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
