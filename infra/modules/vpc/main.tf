resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr_block

  tags = {
    Name = var.vpc_name
  }
}

resource "aws_subnet" "public" {
  count = length(var.public_subnet_names)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = var.public_subnet_names[count.index]
  }

}

resource "aws_subnet" "private" {
  count = length(var.private_subnet_names)

  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = var.private_subnet_names[count.index]
  }

}

resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = var.igw_name
  }
}

resource "aws_eip" "main" {
  domain = var.vpc_name
}

resource "aws_nat_gateway" "nat" {
  count = length(var.public_subnet_names)

  allocation_id = aws_eip.main.id
  subnet_id     = aws_subnet.public[count.index]

  tags = {
    Name = var.nat_gateway_name
  }

  depends_on = [aws_internet_gateway.gw]
}

resource "aws_route_table" "default" {
  count  = length(var.public_subnet_names)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = var.default_route
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name = var.default_route_table_name
  }
}

resource "aws_route_table" "nat" {
  count  = length(var.public_subnet_names)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = var.default_route
    gateway_id = aws_nat_gateway.nat[count.index]
  }

  tags = {
    Name = var.nat_route_table_name
  }
}


resource "aws_route_table_association" "public" {
  count = length(var.public_subnet_names)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.default[count.index]
}

resource "aws_route_table_association" "nat" {
  count = length(var.private_subnet_names)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.nat[count.index]
}

