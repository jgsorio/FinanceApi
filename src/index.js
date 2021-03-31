const express = require('express');
const { v4: uuid } = require('uuid');
const app = express();

//Banco de Dados Fake
const customers = [];

//Middlewares
app.use(express.json());

function verifyIfCustomerExists(request, response, next) {
    const { cpf } = request.headers; //Token
    const customerResult = customers.find(customer => customer.cpf == cpf);
    if (!customerResult) {
        return response.status(400).json({ error: "Usuário não existe!" });
    }
    request.customer = customerResult;
    return next();
}


/**
 * Faz o calculo total do saldo
 */
function getBalance(statements) {
    let saldo = 0;
    statements.forEach(statement => {
        statement.type == 'Credit' ? saldo += statement.amount : saldo -= statement.amount;
    });
    return saldo;
}

/**
 * Criar usuário
 */
app.post('/account', (require, response) => {
    const { cpf, name } = require.body;
    const customerExists = customers.some(customer => customer.cpf == cpf);
    if (customerExists) {
        return response.status(404).json({ error: "CPF já cadastrado!" });
    }
    customers.push({
        cpf,
        name,
        id: uuid(),
        statement: []
    });
    return response.status(201).json({ message: "Usuário Criado com Sucesso!" });
});

/**
 * Realizar uma transacao de credito ou débito
 */
app.post('/transaction', verifyIfCustomerExists, (request, response) => {
    const { description, amount, type } = request.body;
    const { customer } = request;
    const statementOptions = {
        description,
        amount,
        type,
        created_at: new Date()
    };

    customer.statement.push(statementOptions);
    return response.status(201).json({ message: "Transação Realizada com Sucesso!" });
});

/**
 * Extrato
 */
app.get('/statements', verifyIfCustomerExists, (request, response) => {
    const { customer } = request;
    return response.status(200).json(customer.statement);
});

/**
 * Filtrar extrato por data
 */
app.get('/statements/filter', verifyIfCustomerExists, (request, response) => {
    const { date } = request.query;
    const { customer } = request;
    const dateFormat = new Date(date + ' 00:00').toLocaleDateString('pt-BR');
    const customerStatementsMatches =
        customer.statement.filter(
            statement => new Date(statement.created_at).toLocaleDateString('pt-BR') == dateFormat
        );
    return response.status(200).json(customerStatementsMatches);
});

/**
 * Atualizar nome da conta
 */
app.put('/account', verifyIfCustomerExists, (request, response) => {
    const { name } = request.body;
    const { customer } = request;
    customer.name = name;
    return response.status(201).json({ message: "Alteração Realizada com Sucesso!" });
});

/**
 * Retornar dados da conta (nome e cpf apenas)
 */
app.get('/account', verifyIfCustomerExists, (request, response) => {
    const { customer } = request;
    return response.status(200).json({
        name: customer.name,
        cpf: customer.cpf
    });
});

/**
 * Deletar conta
 */
app.delete('/account', verifyIfCustomerExists, (request, response) => {
    const { customer } = request;
    customers.splice(customer, 1);
    return response.status(200).json({ message: "Usuário Deletado com Sucesso!" });
});

/**
 * Trazer o saldo do client
 */
app.get('/balance', verifyIfCustomerExists, (request, response) => {
    const { customer } = request;
    const balance = getBalance(customer.statement);
    return response.status(200).json(balance);
});

app.listen(3333);