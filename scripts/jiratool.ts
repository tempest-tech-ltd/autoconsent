const { program } = require("commander");
// const fetch = require("node-fetch");

interface autoconsentBrokenTicketArgs {
  email: string;
  token: string;
  type: string;
  summary: string;
  description: string;
  brokenSites: string[];
}

async function createAutoconsentBrokenTicket({
  email,
  token,
  type,
  summary,
  description,
  brokenSites,
}: autoconsentBrokenTicketArgs) {
  const url = `http://localhost:8080/rest/api/3/issue/create`;

  const body = {
    fields: {
      assignee: {
        id: 123,
      },
      issuetype: {
        id: "10000",
      },
      description: {
        content: [
          {
            content: [
              {
                text: "Order entry fails when selecting supplier.",
                type: "text",
              },
            ],
            type: "paragraph",
          },
        ],
        type: "doc",
        version: 1,
      },
    },
  };

  const request = {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString(
        "base64"
      )}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };

  const response = await fetch(
    `https://tempest-tech.atlassian.net/rest/api/3/issue`,
    request
  );
  const responseText = (await response.text()) || "{}";
  const status = `${response.status} ${response.statusText}: ${responseText}`;

  if (response.ok) {
    return JSON.parse(responseText);
  }

  throw new Error(status);
}

async function queryIssue(options: { id: string; email: string; token: string }) {
  const { id, email, token } = options;

  const request = {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(`https://tempest-tech.atlassian.net/rest/api/3/issue/${id}`, request);
  const responseText = (await response.text()) || '{}';
  const status = `${response.status} ${response.statusText}: ${responseText}`;

  if (response.ok) {
    console.log('issue', JSON.parse(responseText));
    return JSON.parse(responseText);
  }

  console.log('ERROR', status);

  throw new Error(status);
}

program
  .command('query')
  .requiredOption('--id <ticket_id>', 'ticket id')
  .requiredOption('--email <user_email>', 'user email')
  .requiredOption('--token <user_token>', 'user token')
  .action(queryIssue);

program
  .command("create-ticket")
  .requiredOption("-e", "--email <user_email>", "user email")
  .requiredOption("-t", "--token <user_token>", "user_token")
  .requiredOption("-i", "--issueType <issue_type>", "issue type")
  .requiredOption("-s", "--summary <ticket summary>", "Ticket summary")
  .requiredOption("-d", "--description <ticket summary>", "Ticket summary")
  .requiredOption("-b", "--body <ticket body>", "Ticket body")
  .requiredOption("-p", "--parent")
  .option("-f", "--fix-version <fix_version>", "Fix version number")
  .action(createAutoconsentBrokenTicket);

program.parseAsync();
