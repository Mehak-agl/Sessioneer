function Signup() {
  return (
    <div>
      <h1>Signup Page</h1>

      <input placeholder="Full Name" />
      <br /><br />

      <input placeholder="Email" />
      <br /><br />

      <input type="password" placeholder="Password" />
      <br /><br />

      <select>
        <option>Coordinator</option>
        <option>Tutor</option>
      </select>
      <br /><br />

      <button>Signup</button>
    </div>
  );
}

export default Signup;